"use client";

import { Document, Page, PDFDownloadLink, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { GradingFeedback, SubmissionRow } from "@/lib/types";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, color: "#0f172a", lineHeight: 1.5 },
  title: { fontSize: 24, marginBottom: 6, fontWeight: 700 },
  subtitle: { fontSize: 12, marginBottom: 18, color: "#475569" },
  section: { marginTop: 16, paddingTop: 10, borderTop: "1px solid #cbd5e1" },
  heading: { fontSize: 15, marginBottom: 8, fontWeight: 700 },
  band: { fontSize: 18, marginVertical: 10, color: "#0369a1", fontWeight: 700 },
  item: { marginBottom: 8 },
  label: { fontWeight: 700 },
});

function FeedbackDocument({ submission, feedback }: { submission: SubmissionRow; feedback: GradingFeedback }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>IELTS Writing Feedback</Text>
        <Text style={styles.subtitle}>Học sinh: {submission.student_name} — Submission ID: {submission.id}</Text>
        <Text style={styles.band}>Overall Band: {feedback.overall_band}</Text>
        <Text>{feedback.examiner_summary}</Text>

        {feedback.task1 && (
          <View style={styles.section}>
            <Text style={styles.heading}>Task 1 — Band {feedback.task1.band}</Text>
            <Text><Text style={styles.label}>Task Achievement: </Text>{feedback.task1.TA}</Text>
            <Text><Text style={styles.label}>Coherence and Cohesion: </Text>{feedback.task1.CC}</Text>
            <Text><Text style={styles.label}>Lexical Resource: </Text>{feedback.task1.LR}</Text>
            <Text><Text style={styles.label}>Grammatical Range and Accuracy: </Text>{feedback.task1.GRA}</Text>
          </View>
        )}

        {feedback.task2 && (
          <View style={styles.section}>
            <Text style={styles.heading}>Task 2 — Band {feedback.task2.band}</Text>
            <Text><Text style={styles.label}>Task Response: </Text>{feedback.task2.TR}</Text>
            <Text><Text style={styles.label}>Coherence and Cohesion: </Text>{feedback.task2.CC}</Text>
            <Text><Text style={styles.label}>Lexical Resource: </Text>{feedback.task2.LR}</Text>
            <Text><Text style={styles.label}>Grammatical Range and Accuracy: </Text>{feedback.task2.GRA}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.heading}>Corrections</Text>
          {feedback.corrections.map((correction, index) => (
            <View key={`${correction.original}-${index}`} style={styles.item}>
              <Text><Text style={styles.label}>Original: </Text>{correction.original}</Text>
              <Text><Text style={styles.label}>Corrected: </Text>{correction.corrected}</Text>
              <Text><Text style={styles.label}>Explanation: </Text>{correction.explanation}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default function FeedbackExport({ submission }: { submission: SubmissionRow }) {
  if (!submission.feedback) {
    return null;
  }

  return (
    <PDFDownloadLink
      document={<FeedbackDocument submission={submission} feedback={submission.feedback} />}
      fileName={`ielts-feedback-${submission.id}.pdf`}
      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
    >
      {({ loading }) => (loading ? "Preparing PDF..." : "Export PDF")}
    </PDFDownloadLink>
  );
}
