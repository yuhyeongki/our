@echo off
chcp 65001 > nul
echo ========================================================
echo  김해영운고 학급 상담 및 건의함 시스템 - 깃허브 푸시
echo ========================================================
echo.

echo [1/4] Git 저장소 및 원격 레포지토리 연결 중...
"C:\Program Files\Git\cmd\git.exe" init
"C:\Program Files\Git\cmd\git.exe" remote remove origin 2>nul
"C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/yuhyeongki/our.git
"C:\Program Files\Git\cmd\git.exe" branch -M main

echo [2/4] 프로젝트 파일 추가 중...
"C:\Program Files\Git\cmd\git.exe" add .

echo [3/4] 변경 사항 커밋 중...
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: initial commit for Kimhae Youngwoon HS counseling platform"

echo [4/4] 깃허브(https://github.com/yuhyeongki/our)로 푸시 중...
echo (※ 브라우저에 GitHub 로그인 또는 Authorize 승인 창이 뜨면 클릭해주세요)
"C:\Program Files\Git\cmd\git.exe" push -u origin main
if errorlevel 1 (
    echo.
    echo [안내] 원격 저장소의 기존 파일과 병합 후 재푸시합니다...
    "C:\Program Files\Git\cmd\git.exe" pull --rebase origin main
    "C:\Program Files\Git\cmd\git.exe" push -u origin main
)

echo.
echo ========================================================
echo  깃허브 푸시가 성공적으로 완료되었습니다!
echo ========================================================
pause
