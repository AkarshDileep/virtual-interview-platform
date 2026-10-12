import uuid

from django.db import models


class HostedInterview(models.Model):
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    owner_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    title = models.CharField(max_length=200)
    duration_minutes = models.PositiveIntegerField(default=30)
    questions = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class CandidateAttempt(models.Model):
    interview = models.ForeignKey(HostedInterview, related_name='attempts', on_delete=models.CASCADE)
    candidate_name = models.CharField(max_length=160)
    candidate_email = models.EmailField(blank=True)
    answers = models.JSONField(default=list)
    score = models.PositiveIntegerField(null=True, blank=True)
    max_score = models.PositiveIntegerField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='in_progress')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']