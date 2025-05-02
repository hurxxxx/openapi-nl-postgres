#!/bin/bash
# PostgreSQL Natural Language Query Server 시작 스크립트

# Conda 환경 확인 및 활성화
CONDA_ENV_NAME="openapi-nl-postgres"

# Conda 초기화
if [ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ]; then
    . "$HOME/miniconda3/etc/profile.d/conda.sh"
elif [ -f "$HOME/anaconda3/etc/profile.d/conda.sh" ]; then
    . "$HOME/anaconda3/etc/profile.d/conda.sh"
elif [ -f "/opt/conda/etc/profile.d/conda.sh" ]; then
    . "/opt/conda/etc/profile.d/conda.sh"
else
    echo "Conda 초기화 파일을 찾을 수 없습니다. Conda가 설치되어 있는지 확인하세요."
    echo "Conda 없이 서버를 시작합니다."
    uvicorn main:app --host 0.0.0.0 --reload
    exit 1
fi

# Conda 환경 확인
if conda env list | grep -q "$CONDA_ENV_NAME"; then
    echo "Conda 환경 '$CONDA_ENV_NAME'을(를) 활성화합니다..."
    conda activate $CONDA_ENV_NAME

    if [ $? -ne 0 ]; then
        echo "Conda 환경 활성화에 실패했습니다. 기본 환경에서 서버를 시작합니다."
    else
        echo "Conda 환경 '$CONDA_ENV_NAME'이(가) 활성화되었습니다."
    fi
else
    echo "Conda 환경 '$CONDA_ENV_NAME'을(를) 찾을 수 없습니다."
    echo "새 환경을 생성하시겠습니까? (y/n)"
    read -r answer

    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo "Conda 환경 '$CONDA_ENV_NAME'을(를) 생성합니다..."
        conda create -n $CONDA_ENV_NAME python=3.9 -y

        if [ $? -ne 0 ]; then
            echo "Conda 환경 생성에 실패했습니다. 기본 환경에서 서버를 시작합니다."
        else
            echo "Conda 환경 '$CONDA_ENV_NAME'이(가) 생성되었습니다."
            conda activate $CONDA_ENV_NAME

            echo "필요한 패키지를 설치합니다..."
            pip install -r requirements.txt

            if [ $? -ne 0 ]; then
                echo "패키지 설치에 실패했습니다. 서버 시작이 실패할 수 있습니다."
            fi
        fi
    else
        echo "기본 환경에서 서버를 시작합니다."
    fi
fi

# 서버 실행
echo "서버를 시작합니다..."
uvicorn main:app --host 0.0.0.0 --reload
