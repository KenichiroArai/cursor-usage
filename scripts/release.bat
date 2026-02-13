@ECHO OFF
REM ===========================================
REM Release Automation Script (Web Project)
REM ===========================================

REM 前提：
REM - Git がインストール済み
REM - GitHub CLI (gh) は任意
REM - UTF-8 で保存

CHCP 65001 > nul
SETLOCAL EnableDelayedExpansion

REM =============================
REM 引数チェック
REM =============================

IF "%~3"=="" (
    ECHO 使用方法：
    ECHO release.bat [作業ブランチ] [リリースブランチ] [バージョン]
    ECHO 例：
    ECHO release.bat feature/main main v1.0.0
    EXIT /b 1
)

SET WORK_BRANCH=%~1
SET RELEASE_BRANCH=%~2
SET VERSION=%~3

REM vプレフィックス補完
IF NOT "%VERSION:~0,1%"=="v" (
    SET VERSION=v%VERSION%
)

ECHO.
ECHO =====================================
ECHO リリース開始
ECHO 作業ブランチ   : %WORK_BRANCH%
ECHO リリースブランチ : %RELEASE_BRANCH%
ECHO バージョン     : %VERSION%
ECHO =====================================
ECHO.

REM =============================
REM 未コミットチェック（安全）
REM =============================

git diff --quiet
IF errorlevel 1 (
    ECHO 未コミットの変更があります。
    ECHO 先にコミットまたはスタッシュしてください。
    EXIT /b 1
)

git diff --cached --quiet
IF errorlevel 1 (
    ECHO ステージ済みの変更があります。
    ECHO 先にコミットしてください。
    EXIT /b 1
)

REM =============================
REM 最新取得
REM =============================

git fetch
IF errorlevel 1 GOTO error

REM =============================
REM 作業ブランチへ移動
REM =============================

git checkout %WORK_BRANCH%
IF errorlevel 1 GOTO error

git pull origin %WORK_BRANCH% --rebase
IF errorlevel 1 GOTO error

REM =============================
REM 差分チェック
REM =============================

git log origin/%RELEASE_BRANCH%..%WORK_BRANCH% --oneline > nul

IF %errorlevel% EQU 0 (
    ECHO 作業ブランチに新規コミットがあります。
) ELSE (
    ECHO 差分がありません。タグ作成のみ行います。
    GOTO create_tag
)

REM =============================
REM Push
REM =============================

ECHO 作業ブランチをPushします...
git push origin %WORK_BRANCH%
IF errorlevel 1 GOTO error

REM =============================
REM PR作成（ghがある場合）
REM =============================

WHERE gh > nul 2> nul

IF %errorlevel% EQU 0 (

    ECHO Pull Request を作成します...

    gh pr create ^
        --base %RELEASE_BRANCH% ^
        --head %WORK_BRANCH% ^
        --title "Release %VERSION%" ^
        --body "Release %VERSION%"

    IF errorlevel 1 GOTO error

) ELSE (

    ECHO GitHub CLI が見つかりません。
    ECHO 手動でPRを作成してください。
)

ECHO.
ECHO PRをマージしたらEnterを押してください...
PAUSE > nul

REM =============================
REM マージ確認
REM =============================

git fetch
IF errorlevel 1 GOTO error

git merge-base --is-ancestor %WORK_BRANCH% origin/%RELEASE_BRANCH%
IF errorlevel 1 (
    ECHO PRがまだマージされていません。
    EXIT /b 1
)

:create_tag

REM =============================
REM リリースブランチ更新
REM =============================

git checkout %RELEASE_BRANCH%
IF errorlevel 1 GOTO error

git pull origin %RELEASE_BRANCH%
IF errorlevel 1 GOTO error

REM =============================
REM 既存タグ確認
REM =============================

git tag -l %VERSION% | find "%VERSION%" > nul
IF %errorlevel% EQU 0 (
    ECHO 同じタグが既に存在します : %VERSION%
    EXIT /b 1
)

REM =============================
REM タグ作成
REM =============================

ECHO タグを作成します...
git tag %VERSION%
IF errorlevel 1 GOTO error

git push origin %VERSION%
IF errorlevel 1 GOTO error

ECHO.
ECHO =====================================
ECHO リリース完了
ECHO GitHub Actions の実行を確認してください
ECHO =====================================
EXIT /b 0

:error
ECHO.
ECHO エラーが発生しました。
EXIT /b 1
