from rest_framework import serializers
from .models import Submission

class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = '__all__'

    def create(self, validated_data):
        # only keep id and title for selected_movies
        movies = validated_data.pop('selected_movies', [])
        validated_data['selected_movies'] = [{'id': m['id'], 'title': m['title']} for m in movies]
        return super().create(validated_data)
