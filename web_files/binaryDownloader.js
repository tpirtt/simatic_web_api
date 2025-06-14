const config = {
    metadata: [
        { name: "Identifier", type: "string", length: 34, unit: "" },
        { name: "TestName", type: "string", length: 66, unit: "" },
        { name: "TestOperator", type: "string", length: 34, unit: "" },
        { name: "FileNumber", type: "int32", length: 4, unit: "" },
        { name: "StartTime", type: "datetime64", length: 8, unit: "ISO8601" },
        { name: "SamplingInterval", type: "int32", length: 4, unit: "ms" },
    ],
    record: [
        { name: "Flow", type: "float32", length: 4, unit: "lmin" },
        { name: "PressureIn", type: "float32", length: 4, unit: "bar" },
        { name: "PressureOut", type: "float32", length: 4, unit: "bar" },
        { name: "TemperatureIn", type: "float32", length: 4, unit: "C" },
        { name: "TemperatureOut", type: "float32", length: 4, unit: "C" },
        { name: "Vibration", type: "float32", length: 4, unit: "g" },
        { name: "Energy", type: "float32", length: 4, unit: "J" },
        {
            name: "BinaryStates",
            type: "uint32",
            length: 4,
            bits: [
                "RSV_X31", "RSV_X30", "RSV_X29", "RSV_X28", "RSV_X27", "RSV_X26", "RSV_X25", "RSV_X24",
                "RSV_X23", "RSV_X22", "RSV_X21", "RSV_X20", "RSV_X19", "RSV_X18", "RSV_X17", "RSV_X16",
                "RSV_X15", "RSV_X14", "RSV_X13", "RSV_X12", "RSV_X11", "RSV_X10", "RSV_X9", "RSV_X8",
                "RSV_X7", "RSV_X6", "RSV_X5", "RSV_X4", "RSV_X3", "RSV_X2", "RSV_X1", "RSV_X0"
            ]
        }
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

function decodeBinaryStates(value, bitNames) {
    const bits = {};
    for (let i = 0; i < bitNames.length; i++) {
        bits[bitNames[i]] = !!(value & (1 << (31 - i))); // MSB = bit 0
    }
    return bits;
}

function createCSV(metadataValues, records) {
    let csv = 'Metadata\n';
    csv += Object.entries(metadataValues)
        .map(([k, v]) => `"${k}";"${v}"`)
        .join('\n') + '\n\n';

    if (records.length > 0) {
        csv += 'Records\n';

        const headers = ['Index'];

        for (const field of config.record) {
            if (field.name === 'BinaryStates') continue;
            const name = field.unit ? `${field.name}_${field.unit}` : field.name;
            headers.push(name);
        }

        const bitHeaders = Object.keys(records[0]).filter(h => h.startsWith('Bin_'));
        headers.push(...bitHeaders);

        csv += headers.map(h => `"${h}"`).join(';') + '\n';

        for (const record of records) {
            const row = headers.map(h => {
                let val = record[h] ?? "";
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

    const metadataValues = {};
    for (const field of config.metadata) {
        const val = readField(dataView, offset, field);
        offset += field.length;
        const key = field.unit ? `${field.name}_${field.unit}` : field.name;
        metadataValues[key] = val;
    }

    const recordLength = config.record.reduce((sum, f) => sum + f.length, 0);
    const records = [];
    let index = 1;
    while (offset + recordLength <= arrayBuffer.byteLength) {
        const record = {};
        for (const field of config.record) {
            const val = readField(dataView, offset, field);
            offset += field.length;
            if (field.name !== 'BinaryStates') {
                const key = field.unit ? `${field.name}_${field.unit}` : field.name;
                record[key] = val;
            } else {
                record[field.name] = val;
            }
        }

        record.Index = index++;

        const binaryField = config.record.find(f => f.name === "BinaryStates");
        if (binaryField && binaryField.bits) {
            const bitsDecoded = decodeBinaryStates(record.BinaryStates, binaryField.bits);
            for (const [bitName, bitValue] of Object.entries(bitsDecoded)) {
                record[`Bin_${bitName}`] = bitValue;
            }
        }

        records.push(record);
    }

    const jsonData = {
        metadata: metadataValues,
        records: records
    };

    const jsonStr = JSON.stringify(jsonData, null, 2);
    const csvStr = createCSV(metadataValues, records);

    const baseFilename = originalFilename.replace(/\.[^/.]+$/, "");

    const zip = new JSZip();
    zip.file(originalFilename, arrayBuffer);
    zip.file(`${baseFilename}.json`, jsonStr);
    zip.file(`${baseFilename}.csv`, csvStr);

    const content = await zip.generateAsync({ type: "blob" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = `${baseFilename}_bundle.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
