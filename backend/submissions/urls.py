from django.urls import path
from .views import SubmissionCreateView

urlpatterns = [
    path('submit/', SubmissionCreateView.as_view(), name='submit'),
]
