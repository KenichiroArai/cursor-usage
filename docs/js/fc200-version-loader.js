/**
 * バージョン情報を管理するクラス
 */
class VersionLoader {
    constructor() {
        this.versionInfo = null;
        this.yamlPath = this.determineYamlPath();
    }

    /**
     * 現在のページの階層に応じてYAMLファイルのパスを決定する
     * @returns {string} YAMLファイルのパス
     */
    determineYamlPath() {
        const currentPath = window.location.pathname;
        console.log('現在のパス:', currentPath);

        // パスの階層数を判定
        if (currentPath.includes('/pages/old/')) {
            // pages/old/ 配下の場合（2階層下）
            return '../../data/fc200-version-info.yaml';
        } else if (currentPath.includes('/pages/')) {
            // pages/ 配下の場合（1階層下）
            return '../data/fc200-version-info.yaml';
        } else {
            // ルート配下の場合
            return './data/fc200-version-info.yaml';
        }
    }

    /**
     * YAMLファイルからバージョン情報を読み込む
     * @returns {Promise<Object>} バージョン情報オブジェクト
     */
    async loadVersionInfo() {
        try {
            const response = await fetch(this.yamlPath);
            if (!response.ok) {
                throw new Error(`YAMLファイルの読み込みに失敗しました: ${response.status}`);
            }

            const yamlText = await response.text();
            this.versionInfo = this.parseYaml(yamlText);
            console.log('バージョン情報を正常に読み込みました');

            // 解析結果が空の場合はデフォルト値を使用
            if (!this.versionInfo || Object.keys(this.versionInfo).length === 0) {
                console.warn('YAML解析結果が空です。デフォルト値を使用します。');
                this.versionInfo = this.getDefaultVersionInfo();
            }

            return this.versionInfo;
        } catch (error) {
            console.error('バージョン情報の読み込みエラー:', error);
            // フォールバック値を設定して返す
            this.versionInfo = this.getDefaultVersionInfo();
            return this.versionInfo;
        }
    }

    /**
     * 簡易YAML解析（基本的なYAML構造のみサポート）
     * @param {string} yamlText - YAML文字列
     * @returns {Object} 解析されたオブジェクト
     */
    parseYaml(yamlText) {
        const lines = yamlText.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
        const result = {};
        let currentSection = result;
        let currentArrayKey = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            const indent = line.length - line.trimStart().length;

            // リスト項目の場合
            if (trimmedLine.startsWith('- ')) {
                const value = this.parseValue(trimmedLine.substring(2));

                if (currentArrayKey) {
                    // トップレベルの配列の場合
                    if (result[currentArrayKey] && typeof result[currentArrayKey] === 'object' && !Array.isArray(result[currentArrayKey]) && Object.keys(result[currentArrayKey]).length === 0) {
                        result[currentArrayKey] = [];
                    }

                    if (Array.isArray(result[currentArrayKey])) {
                        result[currentArrayKey].push(value);
                    } else if (!Array.isArray(currentSection[currentArrayKey])) {
                        currentSection[currentArrayKey] = [];
                        currentSection[currentArrayKey].push(value);
                    } else {
                        currentSection[currentArrayKey].push(value);
                    }
                }
                continue;
            }

            // キー:値のペアの場合
            if (trimmedLine.includes(':')) {
                const colonIndex = trimmedLine.indexOf(':');
                const key = trimmedLine.substring(0, colonIndex).trim();
                const value = trimmedLine.substring(colonIndex + 1).trim();

                if (indent === 0) {
                    // トップレベルのキー
                    currentSection = result;
                    if (value) {
                        result[key] = this.parseValue(value);
                        currentArrayKey = null;
                    } else {
                        result[key] = {};
                        currentSection = result[key];
                        // 次の行がリスト項目の可能性があるので、currentArrayKeyを設定
                        currentArrayKey = key;
                    }
                } else if (indent === 2) {
                    // セカンドレベルのキー
                    if (value) {
                        currentSection[key] = this.parseValue(value);
                        // 通常の値なので配列キーをクリア
                        currentArrayKey = null;
                    } else {
                        currentArrayKey = key;
                    }
                }
            }
        }
        return result;
    }

    /**
     * YAML値を適切な型に変換する
     * @param {string} value - YAML値の文字列
     * @returns {string|number} 変換された値
     */
    parseValue(value) {
        // 引用符で囲まれた文字列の場合は引用符を除去
        if (value.match(/^".*"$/)) {
            return value.replace(/^"(.*)"$/, '$1');
        }

        // 数値の場合は数値に変換
        if (value.match(/^\d+$/)) {
            return parseInt(value, 10);
        }

        // そのまま文字列として返す
        return value;
    }

    /**
     * デフォルトのバージョン情報を返す
     * @returns {Object} デフォルトのバージョン情報
     */
    getDefaultVersionInfo() {
        return {
            version: {
                current: "読み込み中..."
            },
            github: {
                issue_url: "読み込み中...",
                issue_number: 0
            },
            features: [
                "読み込み中..."
            ],
            metadata: {
                title: "読み込み中...",
                description: "読み込み中..."
            }
        };
    }

    /**
     * バージョン情報を取得する
     * @returns {Object|null} バージョン情報
     */
    getVersionInfo() {
        return this.versionInfo;
    }

    /**
     * 現在のバージョンを取得する
     * @returns {string} 現在のバージョン
     */
    getCurrentVersion() {
        return this.versionInfo?.version?.current || "読み込み中...";
    }

    /**
     * GitHub URLを取得する
     * @returns {string} GitHub URL
     */
    getGitHubUrl() {
        return this.versionInfo?.github?.issue_url || "読み込み中...";
    }

    /**
     * 機能リストを取得する
     * @returns {Array<string>} 機能リスト
     */
    getFeatures() {
        return this.versionInfo?.features || [];
    }

    /**
     * アプリケーションタイトルを取得する
     * @returns {string} アプリケーションタイトル
     */
    getTitle() {
        return this.versionInfo?.metadata?.title || "読み込み中...";
    }
}

// グローバルインスタンスを作成
window.versionLoader = new VersionLoader();

/**
 * バージョン情報を初期化する関数
 * @returns {Promise<void>}
 */
async function initializeVersionInfo() {
    try {
        await window.versionLoader.loadVersionInfo();
        console.log('バージョン情報が正常に読み込まれました');
    } catch (error) {
        console.error('バージョン情報の初期化に失敗しました:', error);
    }
}

// DOM読み込み完了時にバージョン情報を初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVersionInfo);
} else {
    initializeVersionInfo();
}
