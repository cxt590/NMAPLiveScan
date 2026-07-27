 if __name__ == "__main__":
-    app.run(host="127.0.0.1", port=5000, debug=True, threaded=True)
+    host = "127.0.0.1" if os.environ.get("FLASK_ENV") != "production" else "0.0.0.0"
+    debug = os.environ.get("FLASK_ENV") != "production"
+    app.run(host=host, port=5000, debug=debug, threaded=True)