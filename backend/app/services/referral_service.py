"""Referral program: code generation and signup attribution."""
from __future__ import annotations

import secrets
import string

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.referral import Referral, ReferralStatus
from app.models.user import User

_REFERRAL_ALPHABET = string.ascii_uppercase + string.digits
_REFERRAL_CODE_LENGTH = 8


def generate_referral_code() -> str:
    return "".join(secrets.choice(_REFERRAL_ALPHABET) for _ in range(_REFERRAL_CODE_LENGTH))


async def ensure_referral_code(db: AsyncSession, user: User) -> None:
    if user.referral_code:
        return
    for _ in range(12):
        candidate = generate_referral_code()
        existing = await db.execute(select(User.id).where(User.referral_code == candidate))
        if existing.scalar_one_or_none() is None:
            user.referral_code = candidate
            return
    raise RuntimeError("Could not generate a unique referral code")


async def apply_referral_on_signup(
    db: AsyncSession,
    new_user: User,
    ref_code: str | None,
) -> None:
    if not ref_code or not str(ref_code).strip():
        return

    code = str(ref_code).strip().upper()
    result = await db.execute(select(User).where(User.referral_code == code))
    referrer = result.scalar_one_or_none()
    if referrer is None:
        return
    if referrer.id == new_user.id:
        return

    new_user.referred_by_id = referrer.id
    db.add(Referral(referrer_id=referrer.id, referred_id=new_user.id))
    referrer.referral_count = (referrer.referral_count or 0) + 1
