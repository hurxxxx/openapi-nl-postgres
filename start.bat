@echo off
REM PostgreSQL Natural Language Query Server 시작 스크립트


REM 서버 실행
uvicorn main:app --host 0.0.0.0 --reload
