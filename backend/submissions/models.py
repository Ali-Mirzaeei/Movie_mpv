from django.db import models

class Submission(models.Model):
    email = models.EmailField()
    phone = models.CharField(max_length=50)
    selected_movies = models.JSONField()  # stores list
    movie_ratings = models.JSONField()    # stores object or dict
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email
