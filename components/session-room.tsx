"use client";

import { useState, useTransition } from "react";
import {
    Videocamera,
    DocumentText,
    ClipboardCheck,
    CheckCircle,
    Download,
    Link as LinkIcon,
    Upload,
    ClockCircle,
} from "@solar-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { setMeetLink, uploadWriting, submitEvaluation } from "@/app/(app)/sessions/actions";

type SessionData = {
    bookingId: string;
    scheduledAt: string;
    duration: number;
    bundleName: string | null;
    meetLink: string | null;
    studentName: string;
    teacherName: string;
    writingSubmission: {
        fileName: string;
        fileSize: number;
        filePath: string;
        uploadedAt: string;
    } | null;
    evaluation: {
        score: number;
        feedback: string;
        submittedAt: string;
    } | null;
    hasEvaluation: boolean;
    currentStep: number;
    totalSteps: number;
    stepLabels: string[];
    role: "student" | "teacher" | "admin";
    submissionStart: string | null;
    submissionEnd: string | null;
};

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTimeRemaining(submittedAt: string): { expired: boolean; text: string } {
    const deadline = new Date(submittedAt).getTime() + 24 * 60 * 60 * 1000;
    const now = Date.now();
    const diff = deadline - now;
    if (diff <= 0) return { expired: true, text: "Download expired" };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, text: `${hours}h ${minutes}m remaining` };
}

function StepIndicator({ stepLabels, currentStep }: { stepLabels: string[]; currentStep: number }) {
    return (
        <div className="flex flex-col gap-0">
            {stepLabels.map((label, i) => {
                const stepNum = i + 1;
                const isCompleted = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;
                const isFuture = stepNum > currentStep;
                return (
                    <div key={stepNum} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                            <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors ${
                                    isCompleted
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : isCurrent
                                          ? "border-primary bg-background text-primary"
                                          : "border-muted-foreground/30 bg-muted text-muted-foreground"
                                }`}
                            >
                                {isCompleted ? (
                                    <CheckCircle size={16} />
                                ) : (
                                    stepNum
                                )}
                            </div>
                            {i < stepLabels.length - 1 && (
                                <div
                                    className={`h-8 w-0.5 ${
                                        isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                                    }`}
                                />
                            )}
                        </div>
                        <span
                            className={`pt-1 text-sm ${
                                isCurrent
                                    ? "font-semibold text-foreground"
                                    : isFuture
                                      ? "text-muted-foreground"
                                      : "text-foreground"
                            }`}
                        >
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function MeetLinkStep({ data }: { data: SessionData }) {
    const [link, setLink] = useState("");
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();

    const hasMeetLink = !!data.meetLink;

    if (hasMeetLink) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Videocamera size={20} />
                        Google Meet
                    </CardTitle>
                    <CardDescription>Meeting link is ready</CardDescription>
                </CardHeader>
                <CardContent>
                    <a
                        href={data.meetLink!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <LinkIcon size={16} />
                        Join Meeting
                    </a>
                    <p className="mt-2 text-xs text-muted-foreground break-all">{data.meetLink}</p>
                </CardContent>
            </Card>
        );
    }

    if (data.role === "teacher") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Videocamera size={20} />
                        Google Meet
                    </CardTitle>
                    <CardDescription>Paste a Google Meet link for this session</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setError("");
                            startTransition(async () => {
                                const result = await setMeetLink(data.bookingId, link);
                                if (!result.success) setError(result.error);
                            });
                        }}
                        className="flex flex-col gap-3"
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="meetLink">Meeting Link</Label>
                            <Input
                                id="meetLink"
                                type="url"
                                placeholder="https://meet.google.com/..."
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" disabled={pending || !link.trim()} className="w-fit">
                            {pending ? "Saving..." : "Set Meeting Link"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Videocamera size={20} />
                    Google Meet
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <ClockCircle size={16} />
                    <p className="text-sm">Waiting for teacher to set up the meeting link.</p>
                </div>
            </CardContent>
        </Card>
    );
}

function WritingUploadStep({ data }: { data: SessionData }) {
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();

    const isWritingOnly = data.duration === 0;
    const windowOpen = data.submissionStart ? new Date(data.submissionStart) : null;
    const windowClose = data.submissionEnd ? new Date(data.submissionEnd) : null;

    if (data.writingSubmission) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DocumentText size={20} />
                        Writing Submission
                    </CardTitle>
                    <CardDescription>File uploaded successfully</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 rounded-md border p-3">
                        <DocumentText size={24} className="shrink-0 text-primary" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{data.writingSubmission.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatFileSize(data.writingSubmission.fileSize)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isWritingOnly && windowOpen && windowClose) {
        const now = new Date();
        if (now < windowOpen) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DocumentText size={20} />
                            Writing Submission
                        </CardTitle>
                        <CardDescription>
                            Submission window opens on{" "}
                            {windowOpen.toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ClockCircle size={16} />
                            <p className="text-sm">
                                You can upload your PDF once the window opens.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            );
        }
        if (now > windowClose) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DocumentText size={20} />
                            Writing Submission
                        </CardTitle>
                        <CardDescription>Submission window has closed</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ClockCircle size={16} />
                            <p className="text-sm">
                                The submission window ended on{" "}
                                {windowClose.toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            );
        }
    }

    const windowDescription =
        isWritingOnly && windowOpen && windowClose
            ? `Submit your PDF between ${windowOpen.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
              })} and ${windowClose.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
              })}`
            : "Upload your PDF writing submission";

    if (data.role === "student") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DocumentText size={20} />
                        Writing Submission
                    </CardTitle>
                    <CardDescription>{windowDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setError("");
                            const fd = new FormData(e.currentTarget);
                            fd.set("bookingId", data.bookingId);
                            startTransition(async () => {
                                const result = await uploadWriting(fd);
                                if (!result.success) setError(result.error);
                            });
                        }}
                        className="flex flex-col gap-3"
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="file">PDF File</Label>
                            <Input
                                id="file"
                                name="file"
                                type="file"
                                accept="application/pdf"
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" disabled={pending} className="w-fit">
                            <Upload size={16} />
                            {pending ? "Uploading..." : "Upload"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DocumentText size={20} />
                    Writing Submission
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <ClockCircle size={16} />
                    <p className="text-sm">Waiting for student to upload their writing.</p>
                </div>
            </CardContent>
        </Card>
    );
}

function EvaluationStep({ data }: { data: SessionData }) {
    const [score, setScore] = useState("");
    const [feedback, setFeedback] = useState("");
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();

    if (data.evaluation) {
        return <EvaluationResult data={data} />;
    }

    if (data.role === "teacher") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck size={20} />
                        Evaluation
                    </CardTitle>
                    <CardDescription>Evaluate the student&apos;s work</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setError("");
                            startTransition(async () => {
                                const result = await submitEvaluation(
                                    data.bookingId,
                                    Number(score),
                                    feedback,
                                );
                                if (!result.success) setError(result.error);
                            });
                        }}
                        className="flex flex-col gap-4"
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="score">Score (0–100)</Label>
                            <Input
                                id="score"
                                type="number"
                                min={0}
                                max={100}
                                value={score}
                                onChange={(e) => setScore(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="feedback">Feedback</Label>
                            <textarea
                                id="feedback"
                                className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-[120px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                                placeholder="Provide detailed feedback on the student's work..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button
                            type="submit"
                            disabled={pending || !score || !feedback.trim()}
                            className="w-fit"
                        >
                            {pending ? "Submitting..." : "Submit Evaluation"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck size={20} />
                    Evaluation
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <ClockCircle size={16} />
                    <p className="text-sm">Waiting for teacher evaluation.</p>
                </div>
            </CardContent>
        </Card>
    );
}

function EvaluationResult({ data }: { data: SessionData }) {
    if (!data.evaluation) return null;

    const { expired, text } = getTimeRemaining(data.evaluation.submittedAt);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle size={20} className="text-primary" />
                    Evaluation Complete
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Score</span>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                        {data.evaluation.score}/100
                    </Badge>
                </div>
                <div>
                    <span className="text-sm font-medium text-muted-foreground">Feedback</span>
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                        {data.evaluation.feedback}
                    </p>
                </div>
                {data.role === "student" && data.writingSubmission && (
                    <div className="flex items-center gap-2 pt-2">
                        {expired ? (
                            <p className="text-sm text-muted-foreground">{text}</p>
                        ) : (
                            <>
                                <a
                                    href={`/api/sessions/${data.bookingId}/download`}
                                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    <Download size={16} />
                                    Download Submission
                                </a>
                                <span className="text-xs text-muted-foreground">{text}</span>
                            </>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function SessionRoom({ data }: { data: SessionData }) {
    const scheduledDate = new Date(data.scheduledAt);
    const formattedDate = scheduledDate.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const formattedTime = scheduledDate.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-0">
                    {data.duration === 0 && data.submissionStart && data.submissionEnd ? (
                        <div>
                            <span className="text-xs text-muted-foreground">
                                Submission Window
                            </span>
                            <p className="text-sm font-medium">
                                {new Date(data.submissionStart).toLocaleDateString(
                                    undefined,
                                    { year: "numeric", month: "short", day: "numeric" },
                                )}
                                {" \u2014 "}
                                {new Date(data.submissionEnd).toLocaleDateString(
                                    undefined,
                                    { year: "numeric", month: "short", day: "numeric" },
                                )}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <span className="text-xs text-muted-foreground">Date</span>
                                <p className="text-sm font-medium">{formattedDate}</p>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground">Time</span>
                                <p className="text-sm font-medium">{formattedTime}</p>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground">Duration</span>
                                <p className="text-sm font-medium">{data.duration} min</p>
                            </div>
                        </>
                    )}
                    {data.bundleName && (
                        <div>
                            <span className="text-xs text-muted-foreground">Bundle</span>
                            <p className="text-sm font-medium">{data.bundleName}</p>
                        </div>
                    )}
                    {data.role === "admin" ? (
                        <>
                            <div>
                                <span className="text-xs text-muted-foreground">Student</span>
                                <p className="text-sm font-medium">{data.studentName}</p>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground">Teacher</span>
                                <p className="text-sm font-medium">{data.teacherName}</p>
                            </div>
                        </>
                    ) : (
                        <div>
                            <span className="text-xs text-muted-foreground">
                                {data.role === "student" ? "Teacher" : "Student"}
                            </span>
                            <p className="text-sm font-medium">
                                {data.role === "student" ? data.teacherName : data.studentName}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
                <div className="hidden lg:block">
                    <StepIndicator stepLabels={data.stepLabels} currentStep={data.currentStep} />
                </div>
                <div className="lg:hidden">
                    <div className="flex items-center gap-2 pb-2">
                        <Badge variant="outline">
                            Step {data.currentStep} of {data.totalSteps}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {data.stepLabels[data.currentStep - 1]}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {data.stepLabels.includes("Google Meet") && (
                        <MeetLinkStep data={data} />
                    )}

                    {data.stepLabels.includes("Writing Submission") &&
                        data.currentStep >= data.stepLabels.indexOf("Writing Submission") + 1 && (
                            <WritingUploadStep data={data} />
                        )}

                    {data.stepLabels.includes("Evaluation") &&
                        data.currentStep >= data.stepLabels.indexOf("Evaluation") + 1 && (
                            <EvaluationStep data={data} />
                        )}

                    {data.stepLabels.includes("Results") &&
                        data.currentStep >= data.stepLabels.indexOf("Results") + 1 &&
                        !data.stepLabels.includes("Evaluation") && (
                            <EvaluationResult data={data} />
                        )}
                </div>
            </div>
        </div>
    );
}
