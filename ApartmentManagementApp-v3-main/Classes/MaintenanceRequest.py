from sqlalchemy.orm import joinedload
from sqlalchemy import func
from Classes.config import db
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class MaintenanceRequest(db.Model):
    __tablename__ = 'maintenance_requests'

    id = db.Column(db.BigInteger, primary_key=True)
    apartment_id = db.Column(db.BigInteger, db.ForeignKey('apartments.id'), nullable=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    technician_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=True)
    problem_type = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=False)
    images = db.Column(db.JSON, nullable=True)

    status = db.Column(
        db.Enum('Pending', 'Pending Confirmation', 'Approved', 'In Progress',
                'Resolved', 'Cancelled', 'Rejected', name='request_status'),
        server_default='Pending',
        nullable=False
    )

    request_date = db.Column(
        db.DateTime,
        server_default=func.current_timestamp(),
        nullable=False
    )

    scheduled_date = db.Column(db.DateTime, nullable=True)
    response = db.Column(db.Text, nullable=True)
    proposed_cost = db.Column(db.Numeric(10, 2), nullable=True)
    proposed_duration = db.Column(db.String(100), nullable=True)
    cost_confirmed = db.Column(db.Boolean, default=False)
    confirmation_date = db.Column(db.DateTime, nullable=True)

    # Relationships
    technician = db.relationship(
        'User',
        foreign_keys=[technician_id],
        backref='assigned_requests',
        lazy='joined'
    )
    user = db.relationship(
        'User',
        foreign_keys=[user_id],
        backref='maintenance_requests',
        lazy='joined'
    )
    apartment = db.relationship(
        'Apartment',
        backref='maintenance_requests',
        lazy='joined'
    )

    def __repr__(self):
        return f'<MaintenanceRequest {self.id} - {self.problem_type}>'

    def propose_solution(self, cost: float, duration: str):
        self.proposed_cost = cost
        self.proposed_duration = duration
        self.status = 'Pending Confirmation'
        db.session.commit()
        return self

    def confirm_proposal(self):
        if not self.proposed_cost or not self.proposed_duration:
            raise ValueError("No proposal to confirm")
        self.cost_confirmed = True
        self.status = 'Approved'
        self.confirmation_date = datetime.utcnow()
        db.session.commit()
        return self

    def reject_proposal(self):
        self.proposed_cost = None
        self.proposed_duration = None
        self.cost_confirmed = False
        self.status = 'Pending'
        db.session.commit()
        return self

    def start_request(self):
        self.status = 'In Progress'
        db.session.commit()
        return self

    def complete_request(self):
        self.status = 'Resolved'
        db.session.commit()
        return self

    def cancel_request(self):
        self.status = 'Cancelled'
        db.session.commit()
        return self

    def to_dict(self, include_related=True):
        try:
            image_list = json.loads(self.images) if isinstance(self.images, str) else self.images
            image_list = image_list if isinstance(image_list, list) else []
        except Exception:
            image_list = []

        base_dict = {
            'id': self.id,
            'apartment_id': self.apartment_id,
            'user_id': self.user_id,
            'technician_id': self.technician_id,
            'problem_type': self.problem_type,
            'description': self.description,
            'status': self.status,
            'request_date': self.request_date.isoformat() if self.request_date else None,
            'scheduled_date': self.scheduled_date.isoformat() if self.scheduled_date else None,
            'proposed_cost': float(self.proposed_cost) if self.proposed_cost else None,
            'proposed_duration': self.proposed_duration,
            'cost_confirmed': self.cost_confirmed,
            'confirmation_date': self.confirmation_date.isoformat() if self.confirmation_date else None,
            'response': self.response,
            'images': [f"http://localhost:5000/static/{img.lstrip('/')}" for img in image_list] if image_list else []
        }

        if include_related:
            try:
                base_dict['technician'] = {
                    'id': self.technician.id,
                    'name': self.technician.full_name,
                    'email': self.technician.email,
                    'phone': self.technician.phone_number,
                    'role': self.technician.role
                } if self.technician else None
            except Exception as e:
                logger.warning(f"Technician relation error: {e}")
                base_dict['technician'] = None

            try:
                base_dict['user'] = {
                    'id': self.user.id,
                    'name': self.user.full_name,
                    'email': self.user.email,
                    'phone': self.user.phone_number,
                    'role': self.user.role
                } if self.user else None
            except Exception as e:
                logger.warning(f"User relation error: {e}")
                base_dict['user'] = None

            try:
                base_dict['apartment'] = {
                    'id': self.apartment.id,
                    'unit_number': self.apartment.unit_number,
                    'location': self.apartment.location,
                    'type': self.apartment.type
                } if self.apartment else None
            except Exception as e:
                logger.warning(f"Apartment relation error: {e}")
                base_dict['apartment'] = None

        return base_dict

    @classmethod
    def get_with_relations(cls, request_id):
        return (
            db.session.query(cls)
            .options(
                joinedload(cls.user),
                joinedload(cls.technician),
                joinedload(cls.apartment)
            )
            .filter_by(id=request_id)
            .first()
        )

    @classmethod
    def get_by_status(cls, status):
        return (
            db.session.query(cls)
            .options(
                joinedload(cls.user),
                joinedload(cls.apartment)
            )
            .filter_by(status=status)
            .all()
        )

    @classmethod
    def get_pending_confirmation(cls):
        return cls.get_by_status('Pending Confirmation')

    @classmethod
    def get_technician_requests(cls, technician_id, status=None):
        query = (
            db.session.query(cls)
            .options(
                joinedload(cls.user),
                joinedload(cls.apartment)
            )
            .filter_by(technician_id=technician_id)
        )
        if status:
            query = query.filter_by(status=status)
        return query.all()
