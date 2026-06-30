from app.models.user import User, UserRole
from app.models.referral import Referral, ReferralStatus
from app.models.bug import Bug, BugStatus, BugPriority
from app.models.post import Post, PostLike, PollVote, PostType
from app.models.comment import Comment
from app.models.connection import Connection, ConnectionStatus
from app.models.follow import Follow
from app.models.reaction import PostReaction, CommentReaction, MessageReaction, ReactionType
from app.models.bookmark import Repost, Bookmark
from app.models.message import Conversation, Message
from app.models.notification import Notification
from app.models.community import Community, CommunityDiscussion, DiscussionComment, DiscussionLike
from app.models.team import Team, TeamChannel
from app.models.startup import Startup, StartupPosition
from app.models.news_bookmark import NewsBookmark
from app.models.news_interaction import NewsLike, NewsComment
from app.models.workspace import FileAttachment, Milestone, Task, TaskPriority, TaskStatus, Workspace
from app.models.meeting import Meeting
from app.models.school import School, Classroom, Homework
from app.models.platform import PlatformRole
from app.models.admin_console import (
    AdminAnnouncement,
    AdminAuditLog,
    AnnouncementDismissal,
    ContentReport,
    VerificationRequest,  # ✅ REFERRAL REMOVED FROM HERE!
)
from app.models.broadcast import AdminBroadcast
from app.models.push_token import PushToken
from app.models.streak import UserDailyLogin

__all__ = [
    "User",
    "UserRole",
    "School",
    "Classroom",
    "Homework",
    "Post",
    "PostLike",
    "PollVote",
    "PostType",
    "Comment",
    "Connection",
    "ConnectionStatus",
    "Follow",
    "PostReaction",
    "CommentReaction",
    "MessageReaction",
    "ReactionType",
    "Repost",
    "Bookmark",
    "Conversation",
    "Message",
    "Notification",
    "Community",
    "CommunityDiscussion",
    "DiscussionComment",
    "DiscussionLike",
    "Team",
    "TeamChannel",
    "Startup",
    "StartupPosition",
    "NewsBookmark",
    "NewsLike",
    "NewsComment",
    "Workspace",
    "Task",
    "TaskStatus",
    "TaskPriority",
    "Milestone",
    "FileAttachment",
    "Meeting",
    "PlatformRole",
    "AdminAnnouncement",
    "AdminAuditLog",
    "AnnouncementDismissal",
    "AdminBroadcast",
    "PushToken",
    "ContentReport",
    "VerificationRequest",  # ✅ Referral removed from here
    "UserDailyLogin",
    "Referral",              # ✅ Kept only from referral.py
    "ReferralStatus",        # ✅ Kept only from referral.py
]
