import React, { useState } from "react";

/* ---------- Types & Config ---------- */

type StepId = "personal" | "address" | "preferences" | "review";

type StepConfig = {
  id: StepId;
  label: string;
  description?: string;
  optional?: boolean;
};

const STEPS: StepConfig[] = [
  {
    id: "personal",
    label: "Personal Info",
    description: "Tell us who you are",
  },
  { id: "address", label: "Address", description: "Where can we reach you?" },
  {
    id: "preferences",
    label: "Preferences",
    description: "Customize your experience",
    optional: true,
  },
  { id: "review", label: "Review", description: "Confirm and submit" },
];

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  city: string;
  subscribe: boolean;
  plan: "free" | "pro" | "enterprise";
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  country: "",
  city: "",
  subscribe: true,
  plan: "free",
};

/* ---------- Utils ---------- */

function classNames(...classes: Array<string | boolean | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ---------- Root Component ---------- */

export default function MultiStepForm() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [completedStepIds, setCompletedStepIds] = useState<Set<StepId>>(
    () => new Set()
  );
  const [furthestVisitedStepIndex, setFurthestVisitedStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const currentStep = STEPS[currentStepIndex];
  const totalSteps = STEPS.length;
  const completedCount = completedStepIds.size;
  const progressPercent = Math.round((completedCount / (totalSteps - 1)) * 100); // exclude "review" in progress calc

  /* ----- State helpers ----- */

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  function validateStep(stepId: StepId, data: FormData): FormErrors {
    const newErrors: FormErrors = {};

    if (stepId === "personal") {
      if (!data.firstName.trim())
        newErrors.firstName = "First name is required.";
      if (!data.lastName.trim()) newErrors.lastName = "Last name is required.";
      if (!data.email.trim()) {
        newErrors.email = "Email is required.";
      } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
        newErrors.email = "Please enter a valid email.";
      }
    }

    if (stepId === "address") {
      if (!data.country.trim()) newErrors.country = "Country is required.";
      if (!data.city.trim()) newErrors.city = "City is required.";
    }

    return newErrors;
  }

  function goToStep(index: number) {
    if (index < 0 || index >= totalSteps) return;
    if (index > furthestVisitedStepIndex) return; // constrain jumping ahead
    setCurrentStepIndex(index);
  }

  /* ----- Navigation handlers ----- */

  function handleNext() {
    const stepId = currentStep.id;

    if (stepId !== "review") {
      const stepErrors = validateStep(stepId, formData);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
    }

    if (stepId !== "review") {
      setCompletedStepIds((prev) => new Set(prev).add(stepId));
    }

    if (currentStepIndex === totalSteps - 1) {
      handleSubmit();
      return;
    }

    const nextIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextIndex);
    setFurthestVisitedStepIndex((prev) => Math.max(prev, nextIndex));
  }

  function handlePrevious() {
    if (currentStepIndex === 0) return;
    setCurrentStepIndex((idx) => idx - 1);
  }

  function handleSkip() {
    if (!currentStep.optional) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= totalSteps) return;
    setCurrentStepIndex(nextIndex);
    setFurthestVisitedStepIndex((prev) => Math.max(prev, nextIndex));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitMessage(null);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSubmitting(false);
    setSubmitMessage("Form submitted successfully! ✅ (Simulated)");
  }

  /* ---------- Render ---------- */

  return (
    <div className="mx-auto my-6 max-w-xl rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-lg">
      <h1 className="mb-4 text-xl font-semibold">
        Multi-Step Form (React Interview Practice)
      </h1>

      {/* Progress bar */}
      <ProgressBar progressPercent={progressPercent} />

      {/* Step indicator */}
      <StepIndicator
        steps={STEPS}
        currentStepIndex={currentStepIndex}
        completedStepIds={completedStepIds}
        furthestVisitedStepIndex={furthestVisitedStepIndex}
        onStepClick={goToStep}
      />

      {/* Step content */}
      <section
        className="mt-3"
        role="tabpanel"
        aria-labelledby={`step-${currentStep.id}`}
      >
        {currentStep.id === "personal" && (
          <div className="flex flex-col gap-3">
            <TextField
              label="First Name"
              value={formData.firstName}
              onChange={(v) => updateField("firstName", v)}
              error={errors.firstName}
              required
            />
            <TextField
              label="Last Name"
              value={formData.lastName}
              onChange={(v) => updateField("lastName", v)}
              error={errors.lastName}
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(v) => updateField("email", v)}
              error={errors.email}
              required
            />
          </div>
        )}

        {currentStep.id === "address" && (
          <div className="flex flex-col gap-3">
            <TextField
              label="Country"
              value={formData.country}
              onChange={(v) => updateField("country", v)}
              error={errors.country}
              required
            />
            <TextField
              label="City"
              value={formData.city}
              onChange={(v) => updateField("city", v)}
              error={errors.city}
              required
            />
          </div>
        )}

        {currentStep.id === "preferences" && (
          <div className="flex flex-col gap-3">
            <ToggleField
              label="Subscribe to newsletter"
              checked={formData.subscribe}
              onChange={(v) => updateField("subscribe", v)}
            />
            <SelectField
              label="Plan"
              value={formData.plan}
              onChange={(v) => updateField("plan", v as FormData["plan"])}
              options={[
                { value: "free", label: "Free" },
                { value: "pro", label: "Pro" },
                { value: "enterprise", label: "Enterprise" },
              ]}
            />
          </div>
        )}

        {currentStep.id === "review" && (
          <div className="mt-1">
            <h2 className="mb-2 text-base font-semibold">
              Review your details
            </h2>
            <dl className="grid grid-cols-[120px,1fr] gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[140px,1fr]">
              <dt className="font-semibold text-gray-600">Name</dt>
              <dd className="m-0">
                {formData.firstName} {formData.lastName}
              </dd>

              <dt className="font-semibold text-gray-600">Email</dt>
              <dd className="m-0">{formData.email}</dd>

              <dt className="font-semibold text-gray-600">Location</dt>
              <dd className="m-0">
                {formData.city}, {formData.country}
              </dd>

              <dt className="font-semibold text-gray-600">Newsletter</dt>
              <dd className="m-0">
                {formData.subscribe ? "Subscribed" : "Not subscribed"}
              </dd>

              <dt className="font-semibold text-gray-600">Plan</dt>
              <dd className="m-0 capitalize">{formData.plan}</dd>
            </dl>
          </div>
        )}
      </section>

      {/* Navigation */}
      <WizardNav
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        isSubmitting={isSubmitting}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSkip={handleSkip}
        onSubmit={handleSubmit}
      />

      {submitMessage && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {submitMessage}
        </div>
      )}
    </div>
  );
}

/* ---------- Progress Bar Component ---------- */

type ProgressBarProps = {
  progressPercent: number;
};

function ProgressBar({ progressPercent }: ProgressBarProps) {
  return (
    <div
      className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-200"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progressPercent}
      aria-label="Form completion"
    >
      <div
        className="h-full bg-indigo-600 transition-all"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
}

/* ---------- Step Indicator Component ---------- */

type StepIndicatorProps = {
  steps: StepConfig[];
  currentStepIndex: number;
  completedStepIds: Set<StepId>;
  furthestVisitedStepIndex: number;
  onStepClick: (index: number) => void;
};

function StepIndicator({
  steps,
  currentStepIndex,
  completedStepIds,
  furthestVisitedStepIndex,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <nav className="mb-4" aria-label="Form steps">
      <ol className="flex list-none gap-2 overflow-x-auto p-0" role="tablist">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const isCompleted = completedStepIds.has(step.id);
          const isClickable = index <= furthestVisitedStepIndex;

          return (
            <li key={step.id} className="min-w-0 flex-1">
              <button
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={!isClickable}
                onClick={() => isClickable && onStepClick(index)}
                className={classNames(
                  "flex w-full items-start gap-2 rounded-full border px-2 py-2 text-left text-[0.8rem]",
                  "bg-gray-50 border-gray-200",
                  isCurrent && "border-indigo-600 bg-indigo-50",
                  isCompleted && "border-emerald-500",
                  !isClickable && "cursor-default opacity-50",
                  isClickable && "cursor-pointer"
                )}
              >
                <span
                  className={classNames(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs",
                    "bg-gray-200 text-gray-800",
                    isCurrent && "bg-indigo-600 text-white",
                    isCompleted && "bg-emerald-500 text-white"
                  )}
                >
                  {isCompleted ? "✓" : index + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[0.8rem] font-semibold">
                    {step.label}
                  </span>
                  {step.optional && (
                    <span className="text-[0.7rem] text-gray-500">
                      (Optional)
                    </span>
                  )}
                  {step.description && (
                    <span className="text-[0.7rem] text-gray-500">
                      {step.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------- WizardNav Component ---------- */

type WizardNavProps = {
  currentStep: StepConfig;
  currentStepIndex: number;
  totalSteps: number;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
  onSubmit: () => void;
};

function WizardNav({
  currentStep,
  currentStepIndex,
  totalSteps,
  isSubmitting,
  onPrevious,
  onNext,
  onSkip,
  onSubmit,
}: WizardNavProps) {
  const isFirst = currentStepIndex === 0;
  const isLast =
    currentStep.id === "review" || currentStepIndex === totalSteps - 1;

  return (
    <div className="mt-5 flex items-center justify-between gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onPrevious}
        disabled={isFirst}
        className={classNames(
          "rounded-full border px-4 py-2 text-sm",
          "border-gray-300 bg-white text-gray-800",
          isFirst ? "cursor-default opacity-50" : "hover:bg-gray-50"
        )}
      >
        Previous
      </button>

      <div className="flex gap-2">
        {currentStep.optional && !isLast && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border border-transparent px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Skip
          </button>
        )}

        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className={classNames(
              "rounded-full px-4 py-2 text-sm font-medium text-white",
              "bg-indigo-600 hover:bg-indigo-700",
              isSubmitting && "cursor-default opacity-70"
            )}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Field Components (Tailwind) ---------- */

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
};

function TextField({
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
}: TextFieldProps) {
  const id = React.useId();
  return (
    <div className={classNames("flex flex-col gap-1", error && "text-red-600")}>
      <label htmlFor={id} className="text-[0.85rem] font-medium text-gray-800">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={classNames(
          "rounded-lg border px-3 py-2 text-sm",
          "border-gray-300 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500"
        )}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
};

function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="inline-flex items-center text-[0.85rem] text-gray-800"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
        />
        {label}
      </label>
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[0.85rem] font-medium text-gray-800">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
