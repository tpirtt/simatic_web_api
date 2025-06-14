// binaryDownloader.js
const config = {
    metadata: [
        { name: "Identifier", type: "string", length: 34 },
        { name: "TestName", type: "string", length: 66 },
        { name: "TestOperator", type: "string", length: 34 },
        { name: "FileNumber", type: "int32", length: 4 },
        { name: "StartTime", type: "datetime64", length: 8 },
        { name: "SamplingInterval", type: "int32", length: 4 },
    ],
    record: [
        { name: "Flow", type: "float32", length: 4 },
        { name: "PressureIn", type: "float32", length: 4 },
        { name: "PressureOut", type: "float32", length: 4 },
        { name: "TemperatureIn", type: "float32", length: 4 },
        { name: "TemperatureOut", type: "float32", length: 4 },
        { name: "Vibration", type: "float32", length: 4 },
        { name: "Energy", type: "float32", length: 4 },
        { name: "BinaryStates", type: "uint32", length: 4 },
    ]
};

function readField(dataView, offset, field) {
    switch (field.type) {
        case 'string': {
            const len = dataView.getUint8(offset);
            const used = dataView.getUint8(offset + 1);
            const bytes = new Uint8Array(dataView.buffer, offset + 2, used);
            const text = new TextDecoder().decode(bytes).replace(/\0/g, '').trim();
            return text;
        }
        case 'int32':
            return dataView.getInt32(offset, false);
        case 'uint32':
            return dataView.getUint32(offset, false);
        case 'float32':
            return dataView.getFloat32(offset, false);
        case 'datetime64': {
            const nanoseconds = dataView.getBigUint64(offset, false);
            const milliseconds = Number(nanoseconds) / 1e6;
            return new Date(milliseconds).toISOString();
        }
        default:
            throw new Error(`Unsupported type: ${field.type}`);
    }
}

function createCSV(metadataValues, records) {
    let csv = 'Metadata\n';
    csv += Object.entries(metadataValues)
        .map(([k, v]) => `"${k}";"${v}"`)
        .join('\n') + '\n\n';

    if (records.length > 0) {
        csv += 'Records\n';
        const headers = ['Index', ...Object.keys(records[0]).filter(h => h !== 'Index')];
        csv += headers.map(h => `"${h}"`).join(';') + '\n';

        for (const record of records) {
            const row = headers.map(h => {
                let val = record[h];
                if (typeof val === 'string' && (val.includes(';') || val.includes('"'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            });
            csv += row.join(';') + '\n';
        }
    }
    return csv;
}

async function processBinaryAndDownload(arrayBuffer, originalFilename) {
    const dataView = new DataView(arrayBuffer);
    let offset = 0;

    // Read metadata
    const metadataValues = {};
    for (const field of config.metadata) {
        const val = readField(dataView, offset, field);
        offset += field.length;
        metadataValues[field.name] = val;
    }

    // Read records
    const recordLength = config.record.reduce((sum, f) => sum + f.length, 0);
    const records = [];
    let index = 1;
    while (offset + recordLength <= arrayBuffer.byteLength) {
        const record = {};
        for (const field of config.record) {
            const val = readField(dataView, offset, field);
            offset += field.length;
            record[field.name] = val;
        }
        record.Index = index++;
        records.push(record);
    }

    const jsonData = {
        metadata: metadataValues,
        records: records
    };

    const jsonStr = JSON.stringify(jsonData, null, 2);
    const csvStr = createCSV(metadataValues, records);

    const zip = new JSZip();
    zip.file(originalFilename, arrayBuffer);
    zip.file("data.json", jsonStr);
    zip.file("data.csv", csvStr);

    const content = await zip.generateAsync({ type: "blob" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = originalFilename.replace(/\.[^/.]+$/, "") + "_bundle.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
