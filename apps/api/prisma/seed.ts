import { PrismaClient, Role, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean up existing records in reverse dependency order
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1 Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@velozity.com",
      name: "Alice Admin",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  // 2 Project Managers
  const pm1 = await prisma.user.create({
    data: {
      email: "pm1@velozity.com",
      name: "Paula PM (Alpha)",
      role: Role.PROJECT_MANAGER,
      passwordHash,
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      email: "pm2@velozity.com",
      name: "Peter PM (Beta)",
      role: Role.PROJECT_MANAGER,
      passwordHash,
    },
  });

  // 4 Developers
  const dev1 = await prisma.user.create({
    data: {
      email: "dev1@velozity.com",
      name: "Dave Developer 1",
      role: Role.DEVELOPER,
      passwordHash,
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      email: "dev2@velozity.com",
      name: "Dana Developer 2",
      role: Role.DEVELOPER,
      passwordHash,
    },
  });

  const dev3 = await prisma.user.create({
    data: {
      email: "dev3@velozity.com",
      name: "Dylan Developer 3",
      role: Role.DEVELOPER,
      passwordHash,
    },
  });

  const dev4 = await prisma.user.create({
    data: {
      email: "dev4@velozity.com",
      name: "Darcy Developer 4",
      role: Role.DEVELOPER,
      passwordHash,
    },
  });

  // Clients
  const clientAcme = await prisma.client.create({
    data: { name: "Acme Global Industries" },
  });

  const clientNova = await prisma.client.create({
    data: { name: "NovaTech Financial" },
  });

  const clientCyber = await prisma.client.create({
    data: { name: "CyberSphere Health" },
  });

  // 3+ Projects (PM1 owns 2, PM2 owns 1)
  const project1 = await prisma.project.create({
    data: {
      name: "Customer Onboarding Portal",
      description: "Next-generation customer onboarding and verification workflows",
      clientId: clientAcme.id,
      createdById: pm1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Real-time Fraud Detection Engine",
      description: "High-throughput streaming fraud analysis pipeline and alerts",
      clientId: clientNova.id,
      createdById: pm1.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Clinical Telehealth Platform",
      description: "HIPAA-compliant video consult and e-prescription service",
      clientId: clientCyber.id,
      createdById: pm2.id,
    },
  });

  const now = new Date();
  const pastDate1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago (overdue)
  const pastDate2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago (overdue)
  const futureDate1 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // in 3 days
  const futureDate2 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // in 7 days
  const futureDate3 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // in 14 days

  // Project 1 Tasks (5 tasks, including 1 overdue)
  const p1t1 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: "Design ID Verification KYC flow",
      description: "Create interactive wireframes and API endpoints for KYC document uploads",
      assignedDeveloperId: dev1.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: pastDate1,
      isOverdue: true, // Overdue task 1
    },
  });

  const p1t2 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: "Implement OAuth2 Social Logins",
      description: "Integrate Google and GitHub enterprise authentication",
      assignedDeveloperId: dev2.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: futureDate1,
      isOverdue: false,
    },
  });

  const p1t3 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: "Audit Logging Service Integration",
      description: "Ensure all user onboarding actions produce tamper-evident audit logs",
      assignedDeveloperId: dev1.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.CRITICAL,
      dueDate: futureDate2,
      isOverdue: false,
    },
  });

  const p1t4 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: "Mobile Responsive Layout Optimization",
      description: "Fine-tune UI breakpoints for mobile smartphone browsers",
      assignedDeveloperId: dev3.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: pastDate2,
      isOverdue: false,
    },
  });

  const p1t5 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: "End-to-end Cypress UI testing",
      description: "Automate entire client registration to KYC verification flow",
      assignedDeveloperId: dev2.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: futureDate3,
      isOverdue: false,
    },
  });

  // Project 2 Tasks (5 tasks, including 1 overdue)
  const p2t1 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: "Kafka Event Stream Ingestion Pipeline",
      description: "Connect payment gateway webhook events into Kafka topics",
      assignedDeveloperId: dev3.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: pastDate2,
      isOverdue: true, // Overdue task 2
    },
  });

  const p2t2 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: "Anomaly Scoring Inference Model Endpoint",
      description: "Deploy microservice for sub-10ms score calculation",
      assignedDeveloperId: dev4.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      dueDate: futureDate1,
      isOverdue: false,
    },
  });

  const p2t3 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: "Alert Dispatcher via WebSockets",
      description: "Push immediate critical fraud risk events to SOC dashboards",
      assignedDeveloperId: dev3.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: futureDate2,
      isOverdue: false,
    },
  });

  const p2t4 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: "Historical Dataset Backfill Script",
      description: "Re-run transaction scoring across historical 90-day transactions",
      assignedDeveloperId: dev4.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: pastDate1,
      isOverdue: false,
    },
  });

  const p2t5 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: "SOC Dashboard Role-Based Security",
      description: "Strict isolation between tier 1 analysts and tier 2 fraud managers",
      assignedDeveloperId: dev1.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: futureDate3,
      isOverdue: false,
    },
  });

  // Project 3 Tasks (5 tasks under PM2)
  const p3t1 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: "WebRTC Video Signaling Server",
      description: "Implement peer connection exchange and room tokens",
      assignedDeveloperId: dev2.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: futureDate1,
      isOverdue: false,
    },
  });

  const p3t2 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: "E-Prescription Digital Signature",
      description: "Doctor cryptographically signs medication prescriptions",
      assignedDeveloperId: dev4.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      dueDate: futureDate2,
      isOverdue: false,
    },
  });

  const p3t3 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: "Patient Health Record Integration (FHIR)",
      description: "Sync clinical encounter notes to EHR via HL7 FHIR API",
      assignedDeveloperId: dev1.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      dueDate: futureDate1,
      isOverdue: false,
    },
  });

  const p3t4 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: "Appointment Booking SMS Reminders",
      description: "Twilio notification integration for patient reminders",
      assignedDeveloperId: dev4.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: pastDate1,
      isOverdue: false,
    },
  });

  const p3t5 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: "Compliance Checklist and Penetration Testing",
      description: "External security review for HIPAA compliance readiness",
      assignedDeveloperId: dev2.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      dueDate: futureDate3,
      isOverdue: false,
    },
  });

  // Create initial Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        taskId: p1t1.id,
        actorId: dev1.id,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        taskId: p1t3.id,
        actorId: dev1.id,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        taskId: p1t4.id,
        actorId: dev3.id,
        fromStatus: TaskStatus.IN_REVIEW,
        toStatus: TaskStatus.DONE,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        taskId: p2t1.id,
        actorId: dev3.id,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        taskId: p2t2.id,
        actorId: dev4.id,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        taskId: p2t4.id,
        actorId: dev4.id,
        fromStatus: TaskStatus.IN_REVIEW,
        toStatus: TaskStatus.DONE,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        taskId: p3t1.id,
        actorId: dev2.id,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        createdAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
      },
      {
        taskId: p3t3.id,
        actorId: dev1.id,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
      {
        taskId: p3t4.id,
        actorId: dev4.id,
        fromStatus: TaskStatus.IN_REVIEW,
        toStatus: TaskStatus.DONE,
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      },
    ],
  });

  // Create initial Notifications
  await prisma.notification.createMany({
    data: [
      {
        recipientId: dev1.id,
        taskId: p1t1.id,
        message: "You have been assigned to 'Design ID Verification KYC flow'",
        readAt: new Date(),
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        recipientId: pm1.id,
        taskId: p1t3.id,
        message: "Task 'Audit Logging Service Integration' was moved to In Review",
        readAt: null,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        recipientId: pm1.id,
        taskId: p2t2.id,
        message: "Task 'Anomaly Scoring Inference Model Endpoint' was moved to In Review",
        readAt: null,
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        recipientId: pm2.id,
        taskId: p3t3.id,
        message: "Task 'Patient Health Record Integration (FHIR)' was moved to In Review",
        readAt: null,
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
      {
        recipientId: dev3.id,
        taskId: p2t1.id,
        message: "You have been assigned to 'Kafka Event Stream Ingestion Pipeline'",
        readAt: null,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("Seeding complete!");
  console.log("Summary:");
  console.log("- 1 Admin: admin@velozity.com");
  console.log("- 2 PMs: pm1@velozity.com, pm2@velozity.com");
  console.log("- 4 Devs: dev1@velozity.com, dev2@velozity.com, dev3@velozity.com, dev4@velozity.com");
  console.log("- 3 Clients: Acme, NovaTech, CyberSphere");
  console.log("- 3 Projects (2 under PM1, 1 under PM2)");
  console.log("- 15 Tasks (5 per project, 2 overdue, various statuses & priorities)");
  console.log("- 9 Activity logs");
  console.log("- 5 Notifications");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
