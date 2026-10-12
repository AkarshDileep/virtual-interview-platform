from django.urls import path
from .views import (
    create_hosted_interview,
    complete_candidate_attempt,
    download_hosted_results,
    evaluate_interview,
    generate_interview,
    get_questions,
    hosted_interview_dashboard,
    public_hosted_interview,
    start_candidate_attempt,
)

urlpatterns = [
    path('questions/', get_questions, name='get_questions'),
    path('generate-interview/', generate_interview, name='generate_interview'),
    path('evaluate-interview/', evaluate_interview, name='evaluate_interview'),
    path('hosted-interviews/', create_hosted_interview, name='create_hosted_interview'),
    path('hosted-interviews/<uuid:token>/', public_hosted_interview, name='public_hosted_interview'),
    path('hosted-interviews/<uuid:token>/start/', start_candidate_attempt, name='start_candidate_attempt'),
    path('hosted-interviews/<uuid:token>/attempts/<int:attempt_id>/complete/', complete_candidate_attempt, name='complete_candidate_attempt'),
    path('hosted-interviews/<uuid:token>/dashboard/', hosted_interview_dashboard, name='hosted_interview_dashboard'),
    path('hosted-interviews/<uuid:token>/results.csv', download_hosted_results, name='download_hosted_results'),
]
