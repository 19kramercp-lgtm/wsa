import type { CertificateTrack } from "./types.js";

export interface Far61Requirement {
  id: string;
  certificate: CertificateTrack;
  reg: string;
  text: string;
  targetHours?: number;
  targetCount?: number;
}

// Aeronautical experience requirements from 14 CFR Part 61, airplane category.
// These are reference checklists an instructor marks off manually — the
// numeric targets are shown for comparison against the student's logged
// totals, not auto-graded, since several of these requirements have nuances
// (specific distances, landing types, etc.) that a simple hour sum can't
// faithfully capture.
export const FAR61_REQUIREMENTS: Far61Requirement[] = [
  // Private Pilot — Airplane, 61.109(a)
  { id: "private-total", certificate: "private", reg: "61.109(a)", text: "40 hours total flight time", targetHours: 40 },
  {
    id: "private-dual-total",
    certificate: "private",
    reg: "61.109(a)(1)",
    text: "20 hours of flight training from an authorized instructor",
    targetHours: 20,
  },
  {
    id: "private-dual-xc",
    certificate: "private",
    reg: "61.109(a)(2)",
    text: "3 hours of cross-country flight training",
    targetHours: 3,
  },
  {
    id: "private-dual-night",
    certificate: "private",
    reg: "61.109(a)(3)",
    text: "3 hours of night flight training, including one cross-country flight over 100 nm total distance, and 10 night takeoffs and landings",
    targetHours: 3,
    targetCount: 10,
  },
  {
    id: "private-dual-instrument",
    certificate: "private",
    reg: "61.109(a)(4)",
    text: "3 hours of flight training by reference to instruments",
    targetHours: 3,
  },
  {
    id: "private-checkride-prep",
    certificate: "private",
    reg: "61.109(a)(5)",
    text: "3 hours of flight training in preparation for the practical test, within 2 calendar months before the test",
    targetHours: 3,
  },
  { id: "private-solo-total", certificate: "private", reg: "61.109(a)(6)", text: "10 hours of solo flight time", targetHours: 10 },
  {
    id: "private-solo-xc",
    certificate: "private",
    reg: "61.109(a)(6)(i)",
    text: "5 hours of solo cross-country time",
    targetHours: 5,
  },
  {
    id: "private-solo-xc-150",
    certificate: "private",
    reg: "61.109(a)(6)(ii)",
    text: "One solo cross-country flight of 150 nm total distance, with full-stop landings at 3 points, one segment at least 50 nm straight-line",
    targetCount: 1,
  },
  {
    id: "private-solo-tower",
    certificate: "private",
    reg: "61.109(a)(6)(iii)",
    text: "3 solo takeoffs and landings to a full stop at an airport with an operating control tower",
    targetCount: 3,
  },

  // Instrument Rating — Airplane, 61.65
  {
    id: "instrument-xc-pic",
    certificate: "instrument",
    reg: "61.65(d)(1)",
    text: "50 hours of cross-country PIC flight time, at least 10 hours in an airplane",
    targetHours: 50,
  },
  {
    id: "instrument-total",
    certificate: "instrument",
    reg: "61.65(d)(2)",
    text: "40 hours of actual or simulated instrument time",
    targetHours: 40,
  },
  {
    id: "instrument-dual",
    certificate: "instrument",
    reg: "61.65(d)(2)(i)",
    text: "At least 15 hours of instrument flight training from an authorized instructor",
    targetHours: 15,
  },
  {
    id: "instrument-checkride-prep",
    certificate: "instrument",
    reg: "61.65(d)(2)(ii)",
    text: "3 hours of instrument training in preparation for the practical test, within 2 calendar months before the test",
    targetHours: 3,
  },
  {
    id: "instrument-xc-flight",
    certificate: "instrument",
    reg: "61.65(d)(2)(iii)",
    text: "One instrument cross-country flight under IFR: 250 nm along airways or ATC-assigned routing, an instrument approach at each airport, and three different kinds of approaches",
    targetCount: 1,
  },

  // Commercial Pilot — Airplane, 61.129(a)
  { id: "commercial-total", certificate: "commercial", reg: "61.129(a)", text: "250 hours total flight time", targetHours: 250 },
  {
    id: "commercial-powered",
    certificate: "commercial",
    reg: "61.129(a)(1)",
    text: "100 hours in powered aircraft, 50 of which are in airplanes",
    targetHours: 100,
  },
  {
    id: "commercial-pic",
    certificate: "commercial",
    reg: "61.129(a)(2)",
    text: "100 hours of pilot-in-command time, including 50 in airplanes and 50 hours cross-country (10 in airplanes)",
    targetHours: 100,
  },
  {
    id: "commercial-training-areas",
    certificate: "commercial",
    reg: "61.129(a)(3)",
    text: "20 hours of training on the commercial pilot areas of operation, including 10 hours of instrument training (5 in an airplane)",
    targetHours: 20,
  },
  {
    id: "commercial-complex",
    certificate: "commercial",
    reg: "61.129(a)(3)(ii)",
    text: "10 hours of training in a complex, technically advanced, or turbine-powered airplane",
    targetHours: 10,
  },
  {
    id: "commercial-xc-day",
    certificate: "commercial",
    reg: "61.129(a)(3)(iii)",
    text: "One 2-hour cross-country VFR day flight of over 100 nm straight-line distance",
    targetCount: 1,
  },
  {
    id: "commercial-xc-night",
    certificate: "commercial",
    reg: "61.129(a)(3)(iv)",
    text: "One 2-hour cross-country VFR night flight of over 100 nm straight-line distance",
    targetCount: 1,
  },
  {
    id: "commercial-checkride-prep",
    certificate: "commercial",
    reg: "61.129(a)(3)(v)",
    text: "3 hours in preparation for the practical test, within 2 calendar months before the test",
    targetHours: 3,
  },
  {
    id: "commercial-solo-pic",
    certificate: "commercial",
    reg: "61.129(a)(4)",
    text: "10 hours of solo flight time in an airplane, or 10 hours performing PIC duties with an authorized instructor",
    targetHours: 10,
  },
  {
    id: "commercial-xc-300",
    certificate: "commercial",
    reg: "61.129(a)(4)(i)",
    text: "One cross-country flight of not less than 300 nm total distance, with landings at 3 points, one segment at least 250 nm straight-line",
    targetCount: 1,
  },
  {
    id: "commercial-night",
    certificate: "commercial",
    reg: "61.129(a)(4)(ii)",
    text: "5 hours of night flight time, with 10 takeoffs and landings (as sole manipulator) to a full stop, each involving a flight in the traffic pattern at an airport with an operating control tower",
    targetHours: 5,
    targetCount: 10,
  },

  // Certificated Flight Instructor — Airplane, 61.183 / 61.187
  {
    id: "cfi-fundamentals-endorsement",
    certificate: "cfi",
    reg: "61.183(g)",
    text: "Logbook endorsement on the fundamentals of instructing",
    targetCount: 1,
  },
  {
    id: "cfi-fundamentals",
    certificate: "cfi",
    reg: "61.187(b)(1)",
    text: "Flight training on fundamentals of instructing",
    targetCount: 1,
  },
  {
    id: "cfi-technical-subjects",
    certificate: "cfi",
    reg: "61.187(b)(2)",
    text: "Flight training on technical subject areas",
    targetCount: 1,
  },
  {
    id: "cfi-preflight-prep",
    certificate: "cfi",
    reg: "61.187(b)(3)",
    text: "Flight training on preflight preparation",
    targetCount: 1,
  },
  {
    id: "cfi-preflight-lesson",
    certificate: "cfi",
    reg: "61.187(b)(4)",
    text: "Flight training on a preflight lesson on a maneuver to be performed in flight",
    targetCount: 1,
  },
  {
    id: "cfi-preflight-procedures",
    certificate: "cfi",
    reg: "61.187(b)(5)",
    text: "Flight training on preflight procedures",
    targetCount: 1,
  },
  {
    id: "cfi-airport-ops",
    certificate: "cfi",
    reg: "61.187(b)(6)",
    text: "Flight training on airport operations",
    targetCount: 1,
  },
  {
    id: "cfi-takeoffs-landings",
    certificate: "cfi",
    reg: "61.187(b)(7)",
    text: "Flight training on takeoffs, landings, and go-arounds",
    targetCount: 1,
  },
  {
    id: "cfi-fundamentals-flight",
    certificate: "cfi",
    reg: "61.187(b)(8)",
    text: "Flight training on fundamentals of flight",
    targetCount: 1,
  },
  {
    id: "cfi-performance-maneuvers",
    certificate: "cfi",
    reg: "61.187(b)(9)",
    text: "Flight training on performance maneuvers",
    targetCount: 1,
  },
  {
    id: "cfi-ground-reference",
    certificate: "cfi",
    reg: "61.187(b)(10)",
    text: "Flight training on ground reference maneuvers",
    targetCount: 1,
  },
  {
    id: "cfi-slow-flight-stalls-spins",
    certificate: "cfi",
    reg: "61.187(b)(11)",
    text: "Flight training on slow flight, stalls, and spins",
    targetCount: 1,
  },
  {
    id: "cfi-basic-instrument",
    certificate: "cfi",
    reg: "61.187(b)(12)",
    text: "Flight training on basic instrument maneuvers",
    targetCount: 1,
  },
  {
    id: "cfi-emergency-ops",
    certificate: "cfi",
    reg: "61.187(b)(13)",
    text: "Flight training on emergency operations",
    targetCount: 1,
  },
  {
    id: "cfi-night-ops",
    certificate: "cfi",
    reg: "61.187(b)(14)",
    text: "Flight training on night operations, if applicable",
    targetCount: 1,
  },
  {
    id: "cfi-postflight",
    certificate: "cfi",
    reg: "61.187(b)(15)",
    text: "Flight training on postflight procedures",
    targetCount: 1,
  },
];

export interface EndorsementTemplate {
  id: string;
  title: string;
  farReference: string;
  certificate: CertificateTrack | "general";
  expirationDays?: number;
}

// Standard FAA logbook endorsements, organized to follow the training-stage
// structure FAA Advisory Circular 61-65 uses for its endorsement exhibits
// (student pilot solo progression, then knowledge/practical test
// prerequisites for each certificate, then additional ratings and
// recency). expirationDays is set for the handful of endorsements that
// carry a currency window; everything else is a one-time endorsement.
export const ENDORSEMENT_TEMPLATES: EndorsementTemplate[] = [
  // Student pilot — presolo and solo progression
  { id: "presolo-knowledge", title: "Presolo aeronautical knowledge test", farReference: "61.87(b)", certificate: "private" },
  { id: "presolo-training", title: "Presolo flight training", farReference: "61.87(c)", certificate: "private" },
  { id: "solo", title: "Student pilot solo flight", farReference: "61.87(n)", certificate: "private", expirationDays: 90 },
  {
    id: "solo-repeat-same-airport",
    title: "Solo takeoffs and landings at the same airport",
    farReference: "61.93(b)(1)",
    certificate: "private",
  },
  {
    id: "solo-another-airport",
    title: "Solo takeoffs and landings at another airport within 25 nm",
    farReference: "61.93(b)(1)",
    certificate: "private",
  },
  {
    id: "solo-repeat-another-airport",
    title: "Repeated solo flights to another airport within 25 nm",
    farReference: "61.93(b)(2)",
    certificate: "private",
  },
  {
    id: "solo-xc-initial",
    title: "Initial solo cross-country flight",
    farReference: "61.93(c)(1)",
    certificate: "private",
  },
  {
    id: "solo-xc-repeat",
    title: "Repeated solo cross-country flights, not more than 50 nm from home airport",
    farReference: "61.93(c)(2)",
    certificate: "private",
  },
  {
    id: "solo-xc-review",
    title: "Solo cross-country flight — conditions and route reviewed",
    farReference: "61.93(c)(3)",
    certificate: "private",
  },
  {
    id: "solo-class-b",
    title: "Solo flight in Class B airspace",
    farReference: "61.95(a)",
    certificate: "private",
  },
  {
    id: "solo-class-b-airport",
    title: "Solo flight to, from, or at an airport within Class B airspace",
    farReference: "61.95(b)",
    certificate: "private",
  },
  {
    id: "solo-tower",
    title: "Solo takeoffs and landings at an airport with an operating control tower",
    farReference: "61.94",
    certificate: "private",
  },

  // General — knowledge and practical test prerequisites (apply at every certificate level)
  { id: "knowledge-test", title: "Aeronautical knowledge test", farReference: "61.35(a)(1)", certificate: "general" },
  { id: "practical-test", title: "Recommendation for practical test", farReference: "61.39(a)(6)", certificate: "general" },
  { id: "retest", title: "Additional training after a failed test", farReference: "61.49", certificate: "general" },

  // Instrument rating
  {
    id: "instrument-knowledge-test",
    title: "Instrument rating aeronautical knowledge test",
    farReference: "61.65(a)(2)",
    certificate: "instrument",
  },
  {
    id: "instrument-practical-test",
    title: "Instrument rating practical test",
    farReference: "61.65(a)(6)",
    certificate: "instrument",
  },
  {
    id: "ipc",
    title: "Instrument proficiency check",
    farReference: "61.57(d)",
    certificate: "instrument",
    expirationDays: 180,
  },

  // Commercial pilot
  {
    id: "commercial-knowledge-test",
    title: "Commercial pilot aeronautical knowledge test",
    farReference: "61.35(a)(1)",
    certificate: "commercial",
  },
  {
    id: "commercial-practical-test",
    title: "Commercial pilot practical test",
    farReference: "61.39(a)(6)",
    certificate: "commercial",
  },

  // Certificated flight instructor
  { id: "spin-training", title: "Spin awareness training endorsement", farReference: "61.183(g)", certificate: "cfi" },
  {
    id: "cfi-fundamentals-knowledge-test",
    title: "Fundamentals of instructing knowledge test",
    farReference: "61.185(a)(1)",
    certificate: "cfi",
  },
  {
    id: "cfi-knowledge-test",
    title: "Flight instructor aeronautical knowledge test",
    farReference: "61.35(a)(1)",
    certificate: "cfi",
  },
  {
    id: "cfi-practical-test",
    title: "Flight instructor practical test",
    farReference: "61.39(a)(6)",
    certificate: "cfi",
  },
  {
    id: "cfi-renewal",
    title: "Flight instructor certificate renewal — flight training",
    farReference: "61.197(a)(1)",
    certificate: "cfi",
    expirationDays: 730,
  },

  // Additional aircraft category/class/type privileges
  { id: "complex", title: "Complex airplane endorsement", farReference: "61.31(e)", certificate: "general" },
  { id: "high-performance", title: "High-performance airplane endorsement", farReference: "61.31(f)", certificate: "general" },
  { id: "tailwheel", title: "Tailwheel airplane endorsement", farReference: "61.31(i)", certificate: "general" },
  { id: "high-altitude", title: "High-altitude/pressurized airplane endorsement", farReference: "61.31(g)", certificate: "general" },

  // Recency of experience
  { id: "flight-review", title: "Flight review", farReference: "61.56(a)", certificate: "general", expirationDays: 730 },
];
