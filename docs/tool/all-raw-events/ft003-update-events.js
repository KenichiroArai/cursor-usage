const fs = require('fs');
const path = require('path');

/**
 * CSVファイルを読み込む
 * @param {string} filePath - CSVファイルのパス
 * @returns {Array} CSVデータの配列
 */
function readCSV(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index] ? values[index].trim().replace(/^"|"$/g, '') : '';
                });
                data.push(row);
            }
        }

        return data;
    } catch (error) {
        console.error(`CSVファイルの読み込みエラー: ${filePath}`, error.message);
        return [];
    }
}

/**
 * CSV行を解析する（カンマ区切りで、ダブルクォート内のカンマは無視）
 * @param {string} line - CSV行
 * @returns {Array} 解析された値の配列
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current);
    return values;
}

/**
 * データを日付順にソートする（最新順）
 * @param {Array} data - データ配列
 * @returns {Array} ソートされたデータ配列
 */
function sortByDate(data) {
    return data.sort((a, b) => {
        const dateA = new Date(a['Date'] || '');
        const dateB = new Date(b['Date'] || '');
        return dateB - dateA; // 最新順
    });
}

/**
 * 重複を排除する（Date, Model, Total Tokensが同じ場合は重複とみなす）
 * @param {Array} data - データ配列
 * @returns {Array} 重複排除されたデータ配列
 */
function removeDuplicates(data) {
    const seen = new Set();
    const unique = [];

    for (const row of data) {
        const key = `${row['Date']}-${row['Model']}-${row['Total Tokens']}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(row);
        }
    }

    return unique;
}

/**
 * CSVデータをファイルに書き込む
 * @param {string} filePath - 出力ファイルパス
 * @param {Array} data - データ配列
 * @param {Array} headers - ヘッダー配列
 */
function writeCSV(filePath, data, headers) {
    try {
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header] || '';
                    return value.includes(',') ? `"${value}"` : value;
                }).join(',')
            )
        ].join('\n');

        fs.writeFileSync(filePath, csvContent, 'utf8');
        console.log(`CSVファイルを更新しました: ${filePath}`);
    } catch (error) {
        console.error(`CSVファイルの書き込みエラー: ${filePath}`, error.message);
    }
}

/**
 * inputフォルダから全てのusage-events-*.csvファイルを検索する
 * @param {string} inputDir - inputフォルダのパス
 * @returns {Array} CSVファイル情報の配列
 */
function findAllInputCSVFiles(inputDir) {
    try {
        const files = fs.readdirSync(inputDir);
        const csvFiles = files
            .filter(file => file.startsWith('usage-events-') && file.endsWith('.csv'))
            .map(file => {
                const dateMatch = file.match(/usage-events-(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    return {
                        file: file,
                        path: path.join(inputDir, file),
                        date: new Date(dateMatch[1]),
                        dateString: dateMatch[1]
                    };
                }
                return null;
            })
            .filter(item => item !== null)
            .sort((a, b) => a.date - b.date); // 古い順でソート

        console.log(`${csvFiles.length}個のusage-events CSVファイルを発見しました`);
        return csvFiles;
    } catch (error) {
        console.error(`inputフォルダの読み込みエラー: ${inputDir}`, error.message);
        return [];
    }
}

/**
 * 日付文字列からアーカイブフォルダパスを生成する
 * @param {string} dateString - YYYY-MM-DD形式の日付文字列
 * @returns {string} YYYY/MM形式のフォルダパス
 */
function getArchiveFolderPath(dateString) {
    const [year, month] = dateString.split('-');
    return `${year}/${month}`;
}

/**
 * アーカイブフォルダを作成する
 * @param {string} archiveDir - アーカイブディレクトリのベースパス
 * @param {string} folderPath - 作成するフォルダパス（YYYY/MM形式）
 */
function createArchiveFolder(archiveDir, folderPath) {
    const fullPath = path.join(archiveDir, folderPath);
    try {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`アーカイブフォルダを作成しました: ${fullPath}`);
    } catch (error) {
        console.error(`アーカイブフォルダの作成エラー: ${fullPath}`, error.message);
    }
}

/**
 * ファイルをアーカイブフォルダに移動する
 * @param {string} sourceFile - 移動元ファイルパス
 * @param {string} archiveDir - アーカイブディレクトリのベースパス
 * @param {string} dateString - YYYY-MM-DD形式の日付文字列
 */
function moveToArchive(sourceFile, archiveDir, dateString) {
    try {
        const folderPath = getArchiveFolderPath(dateString);
        const targetDir = path.join(archiveDir, folderPath);

        // アーカイブフォルダを作成
        createArchiveFolder(archiveDir, folderPath);

        // ファイルを移動
        const fileName = path.basename(sourceFile);
        const targetFile = path.join(targetDir, fileName);

        fs.renameSync(sourceFile, targetFile);
        console.log(`ファイルをアーカイブに移動しました: ${fileName} → ${folderPath}/`);
    } catch (error) {
        console.error(`ファイルの移動エラー: ${sourceFile}`, error.message);
    }
}

/**
 * データの先頭を比較して新しいデータかどうかを判定する
 * @param {Array} existingData - 既存のデータ配列
 * @param {Array} newData - 新しいデータ配列
 * @returns {boolean} 新しいデータの場合true、既存データと同じまたは古い場合はfalse
 */
function isNewData(existingData, newData) {
    if (existingData.length === 0) {
        console.log('既存データがないため、新しいデータとして扱います');
        return true;
    }

    if (newData.length === 0) {
        console.log('新しいデータが空のため、処理をスキップします');
        return false;
    }

    // 既存データと新しいデータを日付順でソート
    const sortedExisting = sortByDate([...existingData]);
    const sortedNew = sortByDate([...newData]);

    // 既存データの最新（先頭）と新しいデータの最新（先頭）を比較
    const latestExisting = sortedExisting[0];
    const latestNew = sortedNew[0];

    if (!latestExisting || !latestNew) {
        console.log('データの比較に失敗しました');
        return true; // エラーの場合は安全のため新しいデータとして扱う
    }

    const existingDate = new Date(latestExisting['Date'] || '');
    const newDate = new Date(latestNew['Date'] || '');

    console.log(`既存データの最新日付: ${existingDate.toISOString().split('T')[0]}`);
    console.log(`新しいデータの最新日付: ${newDate.toISOString().split('T')[0]}`);

    if (newDate > existingDate) {
        console.log('新しいデータが既存データより新しいため、取り込みます');
        return true;
    } else if (newDate.getTime() === existingDate.getTime()) {
        // 日付が同じ場合は、より詳細な比較を行う
        const existingKey = `${latestExisting['Date']}-${latestExisting['Model']}-${latestExisting['Total Tokens']}`;
        const newKey = `${latestNew['Date']}-${latestNew['Model']}-${latestNew['Total Tokens']}`;

        if (existingKey !== newKey) {
            console.log('日付は同じですが、データ内容が異なるため、取り込みます');
            return true;
        } else {
            console.log('既存データと同じ内容のため、取り込みをスキップします');
            return false;
        }
    } else {
        console.log('新しいデータが既存データより古いため、取り込みをスキップします');
        return false;
    }
}

/**
 * メイン処理
 */
function main() {
    const inputDir = path.join(__dirname, 'input');
    const dataDir = path.join(__dirname, 'data');
    const outputFile = path.join(dataDir, 'usage-events.csv');
    const archiveDir = path.join(inputDir, 'archive', 'usage-events');

    console.log('usage-events CSVファイルの更新を開始します...');

    // 既存のデータを読み込む
    let existingData = [];
    if (fs.existsSync(outputFile)) {
        existingData = readCSV(outputFile);
        console.log(`既存のデータを読み込みました: ${existingData.length}件`);
    }

    // inputフォルダから全てのusage-events CSVファイルを検索
    const csvFiles = findAllInputCSVFiles(inputDir);

    if (csvFiles.length === 0) {
        console.log('処理するCSVファイルが見つかりませんでした');
        return;
    }

    let allNewData = [];
    const filesToArchive = [];

    // 各CSVファイルを処理
    for (const csvFile of csvFiles) {
        console.log(`CSVファイルを処理中: ${csvFile.file} (日付: ${csvFile.dateString})`);
        const inputData = readCSV(csvFile.path);

        if (inputData.length > 0) {
            // 新しいデータを結合
            allNewData = [...allNewData, ...inputData];
            console.log(`  ${inputData.length}件のデータを読み込みました`);

            // アーカイブ対象として記録
            filesToArchive.push(csvFile);
        } else {
            console.log(`  ${csvFile.file}にはデータが含まれていませんでした`);
        }
    }

    if (allNewData.length > 0) {
        // 全てのデータを結合
        let allData = [...existingData, ...allNewData];
        console.log(`合計 ${allNewData.length}件の新しいデータを追加しました`);

        // 重複を排除
        const uniqueData = removeDuplicates(allData);
        console.log(`重複排除後: ${uniqueData.length}件`);

        // 日付順にソート（最新順）
        const sortedData = sortByDate(uniqueData);
        console.log(`日付順にソートしました（最新順）`);

        // ヘッダーを決定（既存のデータのヘッダーを使用）
        const headers = existingData.length > 0
            ? Object.keys(existingData[0])
            : ['Date', 'Kind', 'Model', 'Max Mode', 'Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read', 'Output Tokens', 'Total Tokens', 'Cost'];

        // CSVファイルに書き込み
        writeCSV(outputFile, sortedData, headers);

        console.log('usage-events CSVファイルの更新が完了しました！');
        console.log(`最終的なデータ件数: ${sortedData.length}件`);

        // 処理済みファイルをアーカイブに移動
        console.log('\n処理済みファイルをアーカイブに移動しています...');
        for (const csvFile of filesToArchive) {
            moveToArchive(csvFile.path, archiveDir, csvFile.dateString);
        }
        console.log('アーカイブ処理が完了しました！');
    } else {
        console.log('処理対象となるデータが見つかりませんでした');
    }
}

// スクリプトが直接実行された場合のみmain()を実行
if (require.main === module) {
    main();
}

module.exports = {
    readCSV,
    parseCSVLine,
    sortByDate,
    removeDuplicates,
    writeCSV,
    findAllInputCSVFiles,
    getArchiveFolderPath,
    createArchiveFolder,
    moveToArchive,
    isNewData,
    main
};
