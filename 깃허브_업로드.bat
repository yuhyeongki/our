@echo off
chcp 65001 > nul
echo ==============================================
echo  김해영운고등학교 상담/건의함 깃허브 업로드 진행
echo ==============================================
echo.
cd /d "c:\Users\user\OneDrive - 김해영운고등학교\바탕 화면\newnew"
echo [1/2] 깃허브 원격 저장소로 업로드 중...
"C:\Program Files\Git\cmd\git.exe" push -u origin main --force
echo.
if %ERRORLEVEL% EQU 0 (
    echo ==============================================
    echo  [성공] 깃허브에 성공적으로 업로드되었습니다!
    echo  https://github.com/yuhyeongki/our 에서 확인하세요.
    echo ==============================================
) else (
    echo [안내] 위 오류 메시지를 확인해 주세요.
)
echo.
pause
