import React from 'react';
import path from 'path';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { formatPeriodMonth, formatMoney, formatDate, paymentMethodLabels } from '@/lib/format';

// Merged font files (Hebrew + Latin glyphs in one file per weight) live in public/fonts/.
// path.join is a pure runtime operation — webpack does not statically analyze it,
// avoiding the "Module parse failed" error that require.resolve triggers for binary assets.
const fontsDir = path.join(process.cwd(), 'public', 'fonts');

Font.register({
    family: 'Heebo',
    fonts: [
        { src: path.join(fontsDir, 'heebo-merged-400.woff'), fontWeight: 'normal' },
        { src: path.join(fontsDir, 'heebo-merged-700.woff'), fontWeight: 'bold' },
    ],
});

// Shared base for every Text element: RTL direction + right-aligned.
// Applied via spread so StyleSheet.create keeps full type inference.
const rtl = {
    direction: 'rtl' as const,
    textAlign: 'right' as const,
};

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Heebo',
        fontSize: 11,
        color: '#111111',
        paddingTop: 48,
        paddingBottom: 48,
        paddingHorizontal: 56,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    title: {
        ...rtl,
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111111',
    },
    receiptNumberLabel: {
        ...rtl,
        fontSize: 10,
        color: '#666666',
        marginTop: 4,
    },
    receiptNumber: {
        ...rtl,
        fontSize: 13,
        fontWeight: 'bold',
    },
    logoPlaceholder: {
        width: 80,
        height: 40,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#dddddd',
        marginVertical: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        ...rtl,
        fontSize: 9,
        fontWeight: 'bold',
        color: '#888888',
        textTransform: 'uppercase',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row-reverse',
        marginBottom: 5,
    },
    label: {
        ...rtl,
        fontSize: 10,
        color: '#555555',
        width: 100,
    },
    value: {
        ...rtl,
        fontSize: 10,
        color: '#111111',
        fontWeight: 'bold',
        flex: 1,
    },
    amountValue: {
        ...rtl,
        fontSize: 14,
        color: '#111111',
        fontWeight: 'bold',
        flex: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 36,
        left: 56,
        right: 56,
        borderTopWidth: 1,
        borderTopColor: '#dddddd',
        paddingTop: 10,
    },
    footerText: {
        ...rtl,
        textAlign: 'center',
        fontSize: 9,
        color: '#999999',
    },
});

export interface ReceiptDocumentProps {
    receiptNumber: string;
    buildingName: string;
    buildingAddress: string;
    unitNumber: string;
    payerName: string;
    periodMonth: string;  // YYYY-MM-01
    amount: number;  // agorot
    paymentMethod: string;
    paidAt: Date;
    generatedAt: Date;
}

export default function ReceiptDocument({
    receiptNumber,
    buildingName,
    buildingAddress,
    unitNumber,
    payerName,
    periodMonth,
    amount,
    paymentMethod,
    paidAt,
    generatedAt,
}: ReceiptDocumentProps) {
    const generatedTime =
        `${String(generatedAt.getHours()).padStart(2, '0')}:${String(generatedAt.getMinutes()).padStart(2, '0')}`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header: title + receipt number on the right, logo placeholder on the left */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>קבלה</Text>
                        <Text style={styles.receiptNumberLabel}>מספר קבלה</Text>
                        <Text style={styles.receiptNumber}>{receiptNumber}</Text>
                    </View>
                    <View style={styles.logoPlaceholder} />
                </View>

                <View style={styles.divider} />

                {/* Building & Unit */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>פרטי הנכס</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>כתובת:</Text>
                        <Text style={styles.value}>{buildingAddress}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>דירה מספר:</Text>
                        <Text style={styles.value}>{unitNumber}</Text>
                    </View>
                </View>

                {/* Payer */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>משלם</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>שם המשלם:</Text>
                        <Text style={styles.value}>{payerName}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Payment Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>פרטי תשלום</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>עבור:</Text>
                        <Text style={styles.value}>תשלום ועד הבית - {formatPeriodMonth(periodMonth)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>סכום ששולם:</Text>
                        <Text style={styles.amountValue}>{formatMoney(amount)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>אמצעי תשלום:</Text>
                        <Text style={styles.value}>{paymentMethodLabels[paymentMethod] ?? paymentMethod}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>תאריך תשלום:</Text>
                        <Text style={styles.value}>{formatDate(paidAt)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>קבלה זו הופקה באמצעות מערכת appro</Text>
                    <Text style={styles.footerText}>הופקה ב: {formatDate(generatedAt)} {generatedTime}</Text>
                </View>

            </Page>
        </Document>
    );
}
