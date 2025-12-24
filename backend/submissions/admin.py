from django.contrib import admin
from .models import Submission

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('email', 'phone', 'created_at', 'short_movies', 'short_ratings')

    def short_movies(self, obj):
        return ", ".join([m["title"] for m in obj.selected_movies])
    short_movies.short_description = "Movies"

    def short_ratings(self, obj):
        return ", ".join([f"{k}: {v}" for k,v in obj.movie_ratings.items()])
    short_ratings.short_description = "Ratings"