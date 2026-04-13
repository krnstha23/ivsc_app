"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignPackageToStudent } from "../actions";

export function AssignEnrollmentForm({
  students,
  packages,
}: {
  students: { id: string; name: string; email: string }[];
  packages: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = React.useState("");
  const [packageId, setPackageId] = React.useState("");
  const [classesTotal, setClassesTotal] = React.useState(10);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !packageId) {
      setError("Please select a student and a package.");
      return;
    }
    setPending(true);
    setError("");

    const result = await assignPackageToStudent(
      studentId,
      packageId,
      classesTotal
    );
    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push("/enrollments");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="student">Student</Label>
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger id="student">
            <SelectValue placeholder="Select a student" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="package">Package</Label>
        <Select value={packageId} onValueChange={setPackageId}>
          <SelectTrigger id="package">
            <SelectValue placeholder="Select a package" />
          </SelectTrigger>
          <SelectContent>
            {packages.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="classesTotal">Total Classes</Label>
        <Input
          id="classesTotal"
          type="number"
          min={1}
          value={classesTotal}
          onChange={(e) => setClassesTotal(Number(e.target.value))}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Assigning…" : "Assign Package"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/enrollments")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
