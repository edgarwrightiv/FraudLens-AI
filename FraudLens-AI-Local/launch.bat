@echo off
title Launch Backend
start cmd /k "cd /d \"C:\Users\edgar\OneDrive\Desktop\FraudLens-AI\backend\" && uvicorn main:app --reload"
title Launch Frontend
start cmd /k "cd /d \"C:\Users\edgar\OneDrive\Desktop\FraudLens-AI\frontend\" && npm start"