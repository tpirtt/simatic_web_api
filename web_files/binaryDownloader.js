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
        {
            name: "BinaryStates",
            type: "uint32",
            length: 4,
            bits: [
                "Reserved0",
                "Reserved1",
                "Reserved2",
                "Reserved3",
                "Reserved4",
                "Reserved5",
                "Reserved6",
                "Reserved7",
                "Reserved8",
                "Reserved9",
                "Reserved10",
                "Reserved11",
                "Reserved12",
                "Reserved13",
                "Reserved14",
                "Reserved15",
                "Reserved16",
                "Reserved17",
                "Reserved18",
                "Reserved19",
                "Reserved20",
                "Reserved21",
                "Reserved22",
                "Reserved23",
                "Reserved24",
                "Reserved25",
                "Reserved26",
                "Reserved27",
                "Reserved28",
                "Reserved29",
                "Reserved30",
                "Reserved31"
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

        // Get headers including expanded BinaryStates bit names
        const baseHeaders = Object.keys(records[0]).filter(h => h !== 'Index' && !h.startsWith('BinaryStates_'));
        // Find the bit names from first record keys starting with BinaryStates_
        const bitHeaders = Object.keys(records[0]).filter(h => h.startsWith('BinaryStates_'));
        const headers = ['Index', ...baseHeaders, ...bitHeaders];

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

        // Decode BinaryStates bits if bits are defined
        const binaryField = config.record.find(f => f.name === "BinaryStates");
        if (binaryField && binaryField.bits) {
            const bitsDecoded = decodeBinaryStates(record.BinaryStates, binaryField.bits);
            // Append decoded bits with a prefix to avoid collision
            for (const [bitName, bitValue] of Object.entries(bitsDecoded)) {
                record[`BinaryStates_${bitName}`] = bitValue;
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
