import { useState } from "react";
import {
  FaUpload, FaArrowRight, FaLock, FaEnvelope, FaEye, FaEyeSlash,
  FaTrash, FaShare, FaPlus, FaFolderOpen,
} from "react-icons/fa";
import {
  Button, IconButton, Input, Textarea, Badge,
  Card, CardHeader, CardBody, CardFooter,
  Skeleton, Spinner, Divider,
} from "../components/atoms";
import { FormField, Modal, EmptyState, useToast } from "../components/molecules";

const Section = ({ title, children, description }) => (
  <section style={{ marginBottom: 56 }}>
    <header style={{ marginBottom: 20 }}>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "var(--text-xl)",
        fontWeight: 600,
        letterSpacing: "var(--tracking-snug)",
      }}>{title}</h2>
      {description && (
        <p style={{ color: "var(--fg-muted)", fontSize: "var(--text-sm)", marginTop: 4 }}>
          {description}
        </p>
      )}
    </header>
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start",
    }}>{children}</div>
  </section>
);

const Row = ({ children, style }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", ...style }}>
    {children}
  </div>
);

const Styleguide = () => {
  const [showPw, setShowPw] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  return (
    <div style={{
      maxWidth: "var(--content-max)",
      margin: "0 auto",
      padding: "var(--space-9) var(--space-5)",
      color: "var(--fg-primary)",
      position: "relative",
      zIndex: 2,
    }}>
      <header style={{ marginBottom: 48 }}>
        <Badge variant="brand" size="sm">Internal · PR 2</Badge>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-tight)",
          marginTop: 12,
          background: "var(--brand-grad)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>Design System Styleguide</h1>
        <p style={{ color: "var(--fg-muted)", marginTop: 8, maxWidth: 640, lineHeight: 1.6 }}>
          Every atom and molecule shipped in PR 2, rendered against the live tokens.
          This route is internal — used to verify the system before page refactors land in PR 3+.
        </p>
      </header>

      {/* ---------------- Typography ---------------- */}
      <Section title="Typography" description="Inter (body) + Space Grotesk (display).">
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-display)", lineHeight: 1.05, letterSpacing: "var(--tracking-tight)" }}>Display 56</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-3xl)" }}>H1 — 40</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)" }}>H2 — 32</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)" }}>H3 — 24</div>
          <div style={{ fontSize: "var(--text-md)" }}>Subheading — 18 (Inter)</div>
          <div style={{ fontSize: "var(--text-base)" }}>Body — 16 (Inter)</div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-secondary)" }}>Small — 14</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>Caption — 12</div>
        </div>
      </Section>

      {/* ---------------- Color tokens ---------------- */}
      <Section title="Color tokens" description="Surfaces, foreground, brand, semantic.">
        {[
          ["bg-base","var(--bg-base)"],
          ["bg-surface","var(--bg-surface)"],
          ["bg-elevated","var(--bg-elevated)"],
          ["brand-500","var(--brand-500)"],
          ["brand-700","var(--brand-700)"],
          ["accent-500","var(--accent-500)"],
          ["success","var(--success)"],
          ["warning","var(--warning)"],
          ["danger","var(--danger)"],
          ["info","var(--info)"],
        ].map(([name, val]) => (
          <div key={name} style={{
            width: 120,
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}>
            <div style={{ height: 56, background: val }} />
            <div style={{ padding: "8px 10px", fontSize: 11, color: "var(--fg-muted)" }}>{name}</div>
          </div>
        ))}
      </Section>

      {/* ---------------- Buttons ---------------- */}
      <Section title="Button" description="Variants, sizes, loading & disabled states.">
        <div style={{ display: "grid", gap: 12 }}>
          <Row>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row>
            <Button leftIcon={<FaUpload />}>Upload file</Button>
            <Button rightIcon={<FaArrowRight />} variant="secondary">Continue</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </Row>
          <Button full variant="primary" size="lg">Full width primary</Button>
        </div>
      </Section>

      {/* ---------------- IconButton ---------------- */}
      <Section title="IconButton">
        <Row>
          <IconButton aria-label="Add" variant="brand"><FaPlus /></IconButton>
          <IconButton aria-label="Share" variant="glass"><FaShare /></IconButton>
          <IconButton aria-label="Ghost"><FaEye /></IconButton>
          <IconButton aria-label="Delete" variant="danger"><FaTrash /></IconButton>
          <IconButton aria-label="Large" size="lg" variant="glass"><FaLock /></IconButton>
        </Row>
      </Section>

      {/* ---------------- Inputs / FormField ---------------- */}
      <Section title="Inputs · FormField">
        <div style={{ display: "grid", gap: 16, width: "100%", maxWidth: 480 }}>
          <FormField label="Email" required hint="We will only contact you about your account.">
            <Input type="email" placeholder="you@company.com" leftIcon={<FaEnvelope />} />
          </FormField>
          <FormField label="Password" error={error}>
            <Input
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              leftIcon={<FaLock />}
              onChange={(e) => setError(e.target.value.length > 0 && e.target.value.length < 6 ? "At least 6 characters." : "")}
              rightSlot={
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw(!showPw)}
                  style={{ pointerEvents: "auto" }}
                >
                  {showPw ? <FaEyeSlash /> : <FaEye />}
                </IconButton>
              }
            />
          </FormField>
          <FormField label="Message" hint="Markdown is not supported.">
            <Textarea placeholder="Tell us what's on your mind…" />
          </FormField>
        </div>
      </Section>

      {/* ---------------- Badges ---------------- */}
      <Section title="Badge">
        <Row>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success" dot>Active</Badge>
          <Badge variant="warning" dot>Pending</Badge>
          <Badge variant="danger" dot>Quarantined</Badge>
          <Badge variant="info">v1.4.0</Badge>
          <Badge variant="brand" size="lg">PRO</Badge>
        </Row>
      </Section>

      {/* ---------------- Cards ---------------- */}
      <Section title="Card" description="Variants × elevation. Glass card uses backdrop blur.">
        <Card variant="surface" elevation={1} style={{ width: 240 }}>
          <CardHeader><strong>Surface</strong></CardHeader>
          <CardBody>Default panel for layout sections.</CardBody>
          <CardFooter><Button size="sm" variant="ghost">Action</Button></CardFooter>
        </Card>
        <Card variant="elevated" elevation={2} style={{ width: 240 }}>
          <CardBody>Elevated, drawn one level above surface.</CardBody>
        </Card>
        <Card variant="glass" elevation={3} style={{ width: 240 }}>
          <CardBody>Glass — backdrop-filter on translucent fill.</CardBody>
        </Card>
        <Card variant="brand" elevation={2} interactive tabIndex={0} style={{ width: 240 }}>
          <CardBody>
            <strong>Brand · interactive</strong>
            <p style={{ color: "var(--fg-muted)", fontSize: 13, marginTop: 6 }}>
              Hover for lift + brand-ring border.
            </p>
          </CardBody>
        </Card>
      </Section>

      {/* ---------------- Skeleton / Spinner ---------------- */}
      <Section title="Skeleton & Spinner">
        <Card variant="surface" padding="md" style={{ width: 320 }}>
          <Row style={{ marginBottom: 16, alignItems: "flex-start" }}>
            <Skeleton variant="circle" width={48} height={48} />
            <div style={{ flex: 1 }}>
              <Skeleton variant="text" height={14} style={{ marginBottom: 8, width: "60%" }} />
              <Skeleton variant="text" lines={3} />
            </div>
          </Row>
          <Skeleton variant="rect" width="100%" height={120} />
        </Card>
        <Card variant="surface" padding="md">
          <Row>
            <Spinner size="xs" />
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
            <Spinner size="md" tone="danger" />
            <Spinner size="md" tone="success" />
          </Row>
        </Card>
      </Section>

      {/* ---------------- Divider ---------------- */}
      <Section title="Divider">
        <div style={{ width: 360 }}>
          <p style={{ color: "var(--fg-muted)" }}>Above</p>
          <Divider />
          <p style={{ color: "var(--fg-muted)" }}>Between</p>
          <Divider label="or continue with" />
          <Button variant="secondary" full leftIcon={<FaEnvelope />}>Email</Button>
        </div>
      </Section>

      {/* ---------------- EmptyState ---------------- */}
      <Section title="EmptyState">
        <Card variant="surface" padding="none" style={{ width: "100%", maxWidth: 480 }}>
          <EmptyState
            icon={<FaFolderOpen />}
            title="No files yet"
            description="Upload your first file to start sharing securely with your team."
            action={<Button leftIcon={<FaUpload />}>Upload a file</Button>}
          />
        </Card>
      </Section>

      {/* ---------------- Modal / Toast ---------------- */}
      <Section title="Modal & Toast" description="Click to trigger.">
        <Row>
          <Button onClick={() => setModalOpen(true)} variant="primary">Open modal</Button>
          <Button onClick={() => toast.success({ title: "Saved", description: "Your changes are live." })} variant="secondary">Toast: success</Button>
          <Button onClick={() => toast.error({ title: "Upload failed", description: "File exceeds the 25 MB limit." })} variant="danger">Toast: error</Button>
          <Button onClick={() => toast.info({ title: "Heads up", description: "Link expires in 24 h." })} variant="outline">Toast: info</Button>
        </Row>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Delete this file?"
        description="This action cannot be undone. Shared links will stop working immediately."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                setModalOpen(false);
                toast.success({ title: "File deleted", description: "It will be permanently removed in 30 days." });
              }}
            >
              Delete file
            </Button>
          </>
        }
      >
        <p>You&apos;re about to delete <strong>annual_report_2025.pdf</strong>. All recipients will lose access.</p>
      </Modal>
    </div>
  );
};

export default Styleguide;
