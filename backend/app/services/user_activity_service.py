"""Aggregate recent actions performed by the logged-in user."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.admin_console import VerificationRequest
from app.models.referral import Referral
from app.models.comment import Comment
from app.models.connection import Connection, ConnectionStatus
from app.models.meeting import Meeting
from app.models.post import Post, PostLike
from app.models.user import User


@dataclass
class UserActivityItem:
    id: str
    type: str
    title: str
    description: str | None
    occurred_at: datetime
    link: str | None = None


def _peer_name(user: User | None) -> str:
    return user.name if user and user.name else "a member"


async def fetch_user_recent_activity(
    db: AsyncSession,
    user_id: UUID,
    *,
    limit: int = 5,
) -> list[UserActivityItem]:
    per_source = limit
    items: list[UserActivityItem] = []

    posts_result = await db.execute(
        select(Post)
        .where(Post.user_id == user_id)
        .order_by(desc(Post.created_at))
        .limit(per_source)
    )
    for post in posts_result.scalars().all():
        label = "Created a new post"
        if post.post_type:
            pt = post.post_type.value if hasattr(post.post_type, "value") else str(post.post_type)
            if pt != "text":
                label = f"Published a {pt.replace('_', ' ')}"
        items.append(
            UserActivityItem(
                id=f"post-{post.id}",
                type="post_created",
                title=label,
                description=(post.content[:120] + "…") if len(post.content) > 120 else post.content,
                occurred_at=post.created_at,
                link=f"/posts/{post.id}",
            )
        )

    likes_result = await db.execute(
        select(PostLike, Post, User)
        .join(Post, PostLike.post_id == Post.id)
        .join(User, Post.user_id == User.id)
        .where(PostLike.user_id == user_id)
        .order_by(desc(PostLike.created_at))
        .limit(per_source)
    )
    for like, post, author in likes_result.all():
        ts = like.created_at or post.created_at
        items.append(
            UserActivityItem(
                id=f"like-{like.id}",
                type="post_liked",
                title=f"Liked {_peer_name(author)}'s post",
                description=(post.content[:100] + "…") if len(post.content) > 100 else post.content,
                occurred_at=ts,
                link=f"/posts/{post.id}",
            )
        )

    comments_result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.post).selectinload(Post.author))
        .where(Comment.user_id == user_id)
        .order_by(desc(Comment.created_at))
        .limit(per_source)
    )
    for comment in comments_result.scalars().all():
        author = comment.post.author if comment.post else None
        items.append(
            UserActivityItem(
                id=f"comment-{comment.id}",
                type="comment_added",
                title=f"Commented on {_peer_name(author)}'s post",
                description=(comment.content[:100] + "…") if len(comment.content) > 100 else comment.content,
                occurred_at=comment.created_at,
                link=f"/posts/{comment.post_id}" if comment.post_id else None,
            )
        )

    connections_result = await db.execute(
        select(Connection)
        .options(selectinload(Connection.sender), selectinload(Connection.receiver))
        .where(or_(Connection.sender_id == user_id, Connection.receiver_id == user_id))
        .order_by(desc(Connection.created_at))
        .limit(per_source)
    )
    for conn in connections_result.scalars().all():
        if conn.status == ConnectionStatus.accepted:
            peer = conn.receiver if conn.sender_id == user_id else conn.sender
            items.append(
                UserActivityItem(
                    id=f"conn-accepted-{conn.id}",
                    type="connection_accepted",
                    title=f"Connected with {_peer_name(peer)}",
                    description=None,
                    occurred_at=conn.created_at,
                    link=f"/users/{peer.id}" if peer else None,
                )
            )
        elif conn.status == ConnectionStatus.pending and conn.sender_id == user_id:
            peer = conn.receiver
            items.append(
                UserActivityItem(
                    id=f"conn-sent-{conn.id}",
                    type="connection_sent",
                    title=f"Sent a connection request to {_peer_name(peer)}",
                    description=None,
                    occurred_at=conn.created_at,
                    link=f"/users/{peer.id}" if peer else None,
                )
            )

    # ✅ FIXED: Use host_id instead of organizer_id
    meetings_result = await db.execute(
        select(Meeting)
        .options(selectinload(Meeting.host), selectinload(Meeting.speaker))  # ✅ Use host and speaker
        .where(Meeting.host_id == user_id)  # ✅ Use host_id
        .order_by(desc(Meeting.created_at))
        .limit(per_source)
    )
    for meeting in meetings_result.scalars().all():
        items.append(
            UserActivityItem(
                id=f"meeting-{meeting.id}",
                type="meeting_scheduled",
                title=f"Scheduled a session with {_peer_name(meeting.speaker)}",
                description=meeting.title,
                occurred_at=meeting.created_at,
                link="/sessions",
            )
        )

    verifications_result = await db.execute(
        select(VerificationRequest)
        .where(VerificationRequest.user_id == user_id)
        .order_by(desc(VerificationRequest.created_at))
        .limit(per_source)
    )
    for req in verifications_result.scalars().all():
        items.append(
            UserActivityItem(
                id=f"verification-{req.id}",
                type="verification_submitted",
                title="Submitted verification request",
                description=req.document_type.replace("_", " ").title() if req.document_type else None,
                occurred_at=req.created_at,
                link="/profile",
            )
        )

    referrals_result = await db.execute(
        select(Referral)
        .options(selectinload(Referral.referred))
        .where(Referral.referrer_id == user_id)
        .order_by(desc(Referral.created_at))
        .limit(per_source)
    )
    for ref in referrals_result.scalars().all():
        items.append(
            UserActivityItem(
                id=f"referral-{ref.id}",
                type="referral_joined",
                title="A new member joined using your referral code",
                description=_peer_name(ref.referred),
                occurred_at=ref.created_at,
                link=f"/users/{ref.referred_id}" if ref.referred_id else None,
            )
        )

    items.sort(key=lambda a: a.occurred_at, reverse=True)
    return items[:limit]
