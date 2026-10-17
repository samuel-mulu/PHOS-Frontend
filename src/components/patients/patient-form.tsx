"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createPatientSchema,
  patientToFormValues,
  type BirthInputMode,
  type PatientFormValues,
} from "@/features/patients/schemas";
import {
  parseDuplicateConflict,
  useCreatePatient,
  useUpdatePatient,
} from "@/features/patients/hooks";
import type { Patient } from "@/types/patient";
import { Sex } from "@/types/patient";

const emptyDefaults: PatientFormValues = {
  firstName: "",
  lastName: "",
  sex: Sex.UNKNOWN,
  middleName: "",
  phone: "",
  email: "",
  address: "",
  governmentId: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  allergies: "",
  birthInputMode: "age",
  age: "",
  dateOfBirth: "",
};

export function PatientForm({
  patient,
  onSuccess,
  onCancel,
  showCancelLink = true,
  submitLabel,
}: {
  /** When set, form updates this patient instead of creating. */
  patient?: Patient;
  onSuccess?: (patient: Patient) => void;
  onCancel?: () => void;
  showCancelLink?: boolean;
  submitLabel?: string;
}) {
  const isEdit = Boolean(patient);

  const create = useCreatePatient({
    redirectToProfile: !onSuccess && !isEdit,
    onRegistered: onSuccess,
  });
  const update = useUpdatePatient(patient?.id ?? "", {
    onUpdated: onSuccess,
  });

  const mutation = isEdit ? update : create;
  const duplicate = mutation.isError
    ? parseDuplicateConflict(mutation.error)
    : null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: patient ? patientToFormValues(patient) : emptyDefaults,
  });

  const birthInputMode = watch("birthInputMode");

  function setBirthMode(mode: BirthInputMode) {
    setValue("birthInputMode", mode, { shouldValidate: true });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
    >
      {duplicate ? (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-medium">{duplicate.message}</p>
          <ul className="mt-2 space-y-1">
            {duplicate.matches.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/patients/${m.id}`}
                  className="text-teal-800 underline"
                >
                  {m.patientNumber} — {m.firstName} {m.lastName}
                  {m.phone ? ` (${m.phone})` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="First name *" error={errors.firstName?.message}>
          <Input id="firstName" {...register("firstName")} />
        </Field>
        <Field label="Middle name" error={errors.middleName?.message}>
          <Input id="middleName" {...register("middleName")} />
        </Field>
        <Field label="Last name *" error={errors.lastName?.message}>
          <Input id="lastName" {...register("lastName")} />
        </Field>
        <Field label="Sex" error={errors.sex?.message}>
          <select
            id="sex"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            {...register("sex")}
          >
            {Object.values(Sex).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <Label htmlFor={birthInputMode === "age" ? "age" : "dateOfBirth"}>
              {birthInputMode === "age" ? "Age" : "Date of birth"}
            </Label>
            <div
              className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5"
              role="tablist"
              aria-label="Birth input mode"
            >
              <ModeTab
                active={birthInputMode === "age"}
                onClick={() => setBirthMode("age")}
              >
                Age
              </ModeTab>
              <ModeTab
                active={birthInputMode === "dateOfBirth"}
                onClick={() => setBirthMode("dateOfBirth")}
              >
                DOB
              </ModeTab>
            </div>
          </div>
          {birthInputMode === "age" ? (
            <Input
              id="age"
              type="number"
              min={0}
              max={150}
              inputMode="numeric"
              placeholder="Years"
              {...register("age")}
            />
          ) : (
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
          )}
          {birthInputMode === "age" && errors.age?.message ? (
            <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>
          ) : null}
          {birthInputMode === "dateOfBirth" && errors.dateOfBirth?.message ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.dateOfBirth.message}
            </p>
          ) : null}
        </div>
        <Field label="Phone" error={errors.phone?.message}>
          <Input id="phone" {...register("phone")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input id="email" type="email" {...register("email")} />
        </Field>
        <Field label="Government ID" error={errors.governmentId?.message}>
          <Input id="governmentId" {...register("governmentId")} />
        </Field>
        <Field
          label="Address"
          error={errors.address?.message}
          className="md:col-span-2"
        >
          <Input id="address" {...register("address")} />
        </Field>
        <Field
          label="Emergency contact name"
          error={errors.emergencyContactName?.message}
        >
          <Input
            id="emergencyContactName"
            {...register("emergencyContactName")}
          />
        </Field>
        <Field
          label="Emergency contact phone"
          error={errors.emergencyContactPhone?.message}
        >
          <Input
            id="emergencyContactPhone"
            {...register("emergencyContactPhone")}
          />
        </Field>
        <Field
          label="Allergies"
          error={errors.allergies?.message}
          className="md:col-span-2"
        >
          <Input id="allergies" {...register("allergies")} />
        </Field>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? "Saving…"
            : (submitLabel ??
              (isEdit ? "Save changes" : "Save & continue"))}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : showCancelLink ? (
          <Link href="/patients">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-white text-teal-800 shadow-sm"
          : "text-slate-500 hover:text-slate-700",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
