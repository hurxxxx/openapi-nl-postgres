@echo off
REM PostgreSQL Natural Language Query Server 시작 스크립트

SETLOCAL EnableDelayedExpansion

REM Conda 환경 이름 설정
SET CONDA_ENV_NAME=openapi-nl-postgres

REM Conda 설치 경로 확인
SET CONDA_PATHS=^
%USERPROFILE%\miniconda3\Scripts\activate.bat;^
%USERPROFILE%\anaconda3\Scripts\activate.bat;^
%PROGRAMDATA%\miniconda3\Scripts\activate.bat;^
%PROGRAMDATA%\anaconda3\Scripts\activate.bat;^
%PROGRAMFILES%\miniconda3\Scripts\activate.bat;^
%PROGRAMFILES%\anaconda3\Scripts\activate.bat

SET CONDA_ACTIVATE_PATH=

FOR %%p IN (%CONDA_PATHS%) DO (
    IF EXIST "%%p" (
        SET CONDA_ACTIVATE_PATH=%%p
        GOTO :found_conda
    )
)

:not_found_conda
ECHO Conda 활성화 스크립트를 찾을 수 없습니다. Conda가 설치되어 있는지 확인하세요.
ECHO Conda 없이 서버를 시작합니다.
GOTO :start_server

:found_conda
ECHO Conda 활성화 스크립트를 찾았습니다: %CONDA_ACTIVATE_PATH%
CALL "%CONDA_ACTIVATE_PATH%"

REM 환경이 존재하는지 확인
CALL conda env list | findstr /C:"%CONDA_ENV_NAME%" > nul
IF %ERRORLEVEL% EQU 0 (
    ECHO Conda 환경 '%CONDA_ENV_NAME%'을(를) 활성화합니다...
    CALL conda activate %CONDA_ENV_NAME%

    IF %ERRORLEVEL% NEQ 0 (
        ECHO Conda 환경 활성화에 실패했습니다. 기본 환경에서 서버를 시작합니다.
    ) ELSE (
        ECHO Conda 환경 '%CONDA_ENV_NAME%'이(가) 활성화되었습니다.
    )
) ELSE (
    ECHO Conda 환경 '%CONDA_ENV_NAME%'을(를) 찾을 수 없습니다.
    SET /P ANSWER=새 환경을 생성하시겠습니까? (y/n):

    IF /I "!ANSWER!"=="y" (
        ECHO Conda 환경 '%CONDA_ENV_NAME%'을(를) 생성합니다...
        CALL conda create -n %CONDA_ENV_NAME% python=3.9 -y

        IF %ERRORLEVEL% NEQ 0 (
            ECHO Conda 환경 생성에 실패했습니다. 기본 환경에서 서버를 시작합니다.
        ) ELSE (
            ECHO Conda 환경 '%CONDA_ENV_NAME%'이(가) 생성되었습니다.
            CALL conda activate %CONDA_ENV_NAME%

            ECHO 필요한 패키지를 설치합니다...
            pip install -r requirements.txt

            IF %ERRORLEVEL% NEQ 0 (
                ECHO 패키지 설치에 실패했습니다. 서버 시작이 실패할 수 있습니다.
            )
        )
    ) ELSE (
        ECHO 기본 환경에서 서버를 시작합니다.
    )
)

:start_server
REM 서버 실행
ECHO 서버를 시작합니다...
uvicorn main:app --host 0.0.0.0 --reload

ENDLOCAL
