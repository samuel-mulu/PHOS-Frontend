"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPatientSchema,
  type CreatePatientFormValues,
} from "@/features/patients/schemas";
import {
  parseDuplicateConflict,
  useCreatePatient,
} from "@/features/patients/hooks";
import { Sex } from "@/types/patient";

export function PatientRegisterForm() {
  const create = useCreatePatient();
  const duplicate = create.isError
    ? parseDuplicateConflict(create.error)
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePatientFormValues>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
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
      dateOfBirth: "",
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit((values) => create.mutate(values))}
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
        <Field label="First name" error={errors.firstName?.message}>
          <Input id="firstName" {...register("firstName")} />
        </Field>
        <Field label="Middle name" error={errors.middleName?.message}>
          <Input id="middleName" {...register("middleName")} />
        </Field>
        <Field label="Last name" error={errors.lastName?.message}>
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
        <Field label="Date of birth" error={errors.dateOfBirth?.message}>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <Input id="phone" {...register("phone")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input id="email" type="email" {...register("email")} />
        </Field>
        <Field label="Government ID" error={errors.governmentId?.message}>
          <Input id="governmentId" {...register("governmentId")} />
        </Field>
        <Field label="Address" error={errors.address?.message} className="md:col-span-2">
          <Input id="address" {...register("address")} />
        </Field>
        <Field
          label="Emergency contact name"
          error={errors.emergencyContactName?.message}
        >
          <Input id="emergencyContactName" {...register("emergencyContactName")} />
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
        <Field label="Allergies" error={errors.allergies?.message} className="md:col-span-2">
          <Input id="allergies" {...register("allergies")} />
        </Field>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Register patient"}
        </Button>
        <Link href="/patients">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
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
