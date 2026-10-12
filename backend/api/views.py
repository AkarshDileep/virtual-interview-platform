import json
import os
import time
import csv
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.response import Response
from django.http import HttpResponse

from .models import CandidateAttempt, HostedInterview


OPENROUTER_MODELS = [
    'openai/gpt-4o-mini',
    'google/gemini-2.0-flash-001',
    'anthropic/claude-3.5-haiku',
    'meta-llama/llama-3.3-70b-instruct',
    'mistralai/mistral-small-3.1-24b-instruct',
    'qwen/qwen-2.5-72b-instruct',
]


def extract_resume_text(upload):
    name = upload.name.lower()
    if name.endswith('.pdf'):
        from pypdf import PdfReader
        return '\n'.join(page.extract_text() or '' for page in PdfReader(upload).pages).strip()
    if name.endswith('.docx'):
        from docx import Document
        return '\n'.join(paragraph.text for paragraph in Document(upload).paragraphs).strip()
    raise ValueError('Resume must be a PDF or DOCX file.')


def openrouter_request(messages, response_format=None):
    api_key = os.environ.get('OPENROUTER_API_KEY', '').strip()
    if not api_key:
        raise ValueError('OPENROUTER_API_KEY is not configured on the backend.')

    last_error = 'No model responded.'
    for model in OPENROUTER_MODELS:
        payload = {'model': model, 'messages': messages, 'temperature': 0.4}
        if response_format:
            payload['response_format'] = response_format
        request = Request(
            'https://openrouter.ai/api/v1/chat/completions',
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'Virtual Interview Pro',
            },
            method='POST',
        )
        try:
            with urlopen(request, timeout=45) as response:
                body = json.loads(response.read().decode('utf-8'))
            return body['choices'][0]['message']['content']
        except (HTTPError, URLError, KeyError, json.JSONDecodeError) as error:
            last_error = str(error)
            time.sleep(0.4)
    raise RuntimeError(f'All interview models failed. Last error: {last_error}')


def parse_json_response(content):
    cleaned = content.strip().removeprefix('```json').removesuffix('```').strip()
    return json.loads(cleaned)

@api_view(['GET'])
def get_questions(request):
    questions = [
        {"id": 1, "text": "Can you tell me about yourself?"},
        {"id": 2, "text": "What are your greatest strengths and weaknesses?"},
        {"id": 3, "text": "Why do you want to work for our company?"}
    ]
    return Response(questions)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def generate_interview(request):
    resume = request.FILES.get('resume')
    job_description = request.data.get('job_description', '').strip()
    if not resume or not job_description:
        return Response({'error': 'Resume file and job description are required.'}, status=400)

    try:
        resume_text = extract_resume_text(resume)
        prompt = f'''Create exactly 15 distinct interview questions based on this resume and job description.
Return only valid JSON with this shape: {{"questions": [{{"text": "...", "ideal_answer": "...", "evaluation_points": ["..."]}}]}}.
The ideal answer should be a concise, fact-grounded model answer. Do not invent resume facts.

RESUME:\n{resume_text[:30000]}

JOB DESCRIPTION:\n{job_description[:20000]}'''
        result = parse_json_response(openrouter_request(
            [{'role': 'system', 'content': 'You are an expert technical interviewer. Output strict JSON.'},
             {'role': 'user', 'content': prompt}],
            {'type': 'json_object'},
        ))
        questions = result.get('questions', [])
        if len(questions) != 15:
            raise ValueError('The model did not return exactly 15 questions.')
        return Response({'questions': questions})
    except (ValueError, RuntimeError, ImportError, OSError, json.JSONDecodeError) as error:
        return Response({'error': str(error)}, status=502)


@api_view(['POST'])
@parser_classes([JSONParser])
def evaluate_interview(request):
    questions = request.data.get('questions', [])
    answers = request.data.get('answers', [])
    if len(questions) != len(answers) or not questions:
        return Response({'error': 'Questions and answers must have the same non-zero length.'}, status=400)

    prompt = f'''Evaluate these interview answers against their ideal answers.
Return only valid JSON with this shape: {{"score": 0, "max_score": {len(questions) * 10}, "summary": "...", "results": [{{"question": "...", "answer": "...", "score": 0, "feedback": "..."}}]}}.
Give each answer 0-10 based on correctness, relevance, completeness, and clarity. Be fair to concise answers.

DATA:\n{json.dumps(list(zip(questions, answers)))[:50000]}'''
    try:
        return Response(parse_json_response(openrouter_request(
            [{'role': 'system', 'content': 'You are a fair interview evaluator. Output strict JSON.'},
             {'role': 'user', 'content': prompt}],
            {'type': 'json_object'},
        )))
    except (ValueError, RuntimeError, OSError, json.JSONDecodeError) as error:
        return Response({'error': str(error)}, status=502)


def interview_payload(interview, include_answers=False):
    attempts = interview.attempts.all()
    return {
        'id': interview.id,
        'token': str(interview.token),
        'title': interview.title,
        'duration_minutes': interview.duration_minutes,
        'questions': interview.questions,
        'attempts': [{
            'id': attempt.id,
            'candidate_name': attempt.candidate_name,
            'candidate_email': attempt.candidate_email,
            'status': attempt.status,
            'score': attempt.score,
            'max_score': attempt.max_score,
            'remarks': attempt.remarks,
            'started_at': attempt.started_at,
            'completed_at': attempt.completed_at,
            **({'answers': attempt.answers} if include_answers else {}),
        } for attempt in attempts],
    }


def get_hosted_interview(token):
    try:
        return HostedInterview.objects.get(token=uuid.UUID(str(token)))
    except (HostedInterview.DoesNotExist, ValueError):
        return None


@api_view(['POST'])
@parser_classes([JSONParser])
def create_hosted_interview(request):
    title = str(request.data.get('title', '')).strip()
    questions = request.data.get('questions', [])
    try:
        duration = int(request.data.get('duration_minutes', 30))
    except (TypeError, ValueError):
        duration = 0
    if not title or not isinstance(questions, list) or not questions or not 5 <= duration <= 180:
        return Response({'error': 'Add a title, at least one question, and a duration from 5 to 180 minutes.'}, status=400)
    cleaned_questions = [{'text': str(question.get('text', '')).strip()} for question in questions if isinstance(question, dict)]
    cleaned_questions = [question for question in cleaned_questions if question['text']]
    if not cleaned_questions:
        return Response({'error': 'Add at least one non-empty question.'}, status=400)
    interview = HostedInterview.objects.create(title=title, duration_minutes=duration, questions=cleaned_questions)
    return Response({**interview_payload(interview), 'owner_key': str(interview.owner_key)}, status=201)


@api_view(['GET'])
def public_hosted_interview(request, token):
    interview = get_hosted_interview(token)
    if not interview:
        return Response({'error': 'Interview not found.'}, status=404)
    return Response({
        'title': interview.title,
        'duration_minutes': interview.duration_minutes,
        'questions': interview.questions,
    })


@api_view(['POST'])
@parser_classes([JSONParser])
def start_candidate_attempt(request, token):
    interview = get_hosted_interview(token)
    name = str(request.data.get('candidate_name', '')).strip()
    email = str(request.data.get('candidate_email', '')).strip()
    if not interview or not name:
        return Response({'error': 'Interview and candidate name are required.'}, status=400)
    attempt = CandidateAttempt.objects.create(interview=interview, candidate_name=name, candidate_email=email)
    return Response({'attempt_id': attempt.id, 'title': interview.title, 'duration_minutes': interview.duration_minutes, 'questions': interview.questions}, status=201)


@api_view(['POST'])
@parser_classes([JSONParser])
def complete_candidate_attempt(request, token, attempt_id):
    interview = get_hosted_interview(token)
    try:
        attempt = CandidateAttempt.objects.get(id=attempt_id, interview=interview)
    except CandidateAttempt.DoesNotExist:
        return Response({'error': 'Attempt not found.'}, status=404)
    answers = request.data.get('answers', [])
    if not isinstance(answers, list) or len(answers) != len(interview.questions):
        return Response({'error': 'Please answer every question before submitting.'}, status=400)
    try:
        evaluation = parse_json_response(openrouter_request(
            [{'role': 'system', 'content': 'You are a fair interview evaluator. Output strict JSON.'},
             {'role': 'user', 'content': f'''Evaluate these custom interview answers. Return JSON with score, max_score, summary, and results. Score each answer 0-10 based on relevance, correctness, completeness, and clarity.\nDATA:\n{json.dumps(list(zip(interview.questions, answers)))[:50000]}'''}],
            {'type': 'json_object'},
        ))
        attempt.answers = answers
        attempt.score = int(evaluation.get('score', 0))
        attempt.max_score = int(evaluation.get('max_score', len(answers) * 10))
        attempt.remarks = str(evaluation.get('summary', ''))
        attempt.status = 'completed'
        from django.utils import timezone
        attempt.completed_at = timezone.now()
        attempt.save()
        return Response(evaluation)
    except (ValueError, RuntimeError, OSError, json.JSONDecodeError) as error:
        return Response({'error': str(error)}, status=502)


def owner_interview(request, token):
    interview = get_hosted_interview(token)
    if not interview or str(request.query_params.get('owner_key', '')) != str(interview.owner_key):
        return None, Response({'error': 'Invalid owner link.'}, status=403)
    return interview, None


@api_view(['GET'])
def hosted_interview_dashboard(request, token):
    interview, error = owner_interview(request, token)
    if error:
        return error
    return Response(interview_payload(interview))


@api_view(['GET'])
def download_hosted_results(request, token):
    interview, error = owner_interview(request, token)
    if error:
        return error
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{interview.title[:40]}-results.csv"'
    writer = csv.writer(response)
    writer.writerow(['Candidate', 'Email', 'Status', 'Score', 'Max Score', 'Remarks', 'Started', 'Completed'])
    for attempt in interview.attempts.all():
        writer.writerow([attempt.candidate_name, attempt.candidate_email, attempt.status, attempt.score or '', attempt.max_score or '', attempt.remarks, attempt.started_at, attempt.completed_at or ''])
    return response
