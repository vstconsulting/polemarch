from django import dispatch

api_pre_save = dispatch.Signal(providing_args=["instance", "user"])
api_post_save = dispatch.Signal(providing_args=["instance", "user"])
