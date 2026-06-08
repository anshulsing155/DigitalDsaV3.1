"""Generate Navigation & UI Glitch Resolution Report PDF"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)

WIDTH, HEIGHT = A4
BRAND = HexColor("#cb997e")
DARK = HexColor("#1e293b")
ACCENT = HexColor("#2563eb")
GRAY = HexColor("#64748b")
LIGHT_BG = HexColor("#f8fafc")
WHITE = HexColor("#ffffff")
RED = HexColor("#dc2626")
AMBER = HexColor("#d97706")
GREEN = HexColor("#16a34a")

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle("DocTitle", parent=styles["Title"], fontSize=22, textColor=WHITE, spaceAfter=6, alignment=TA_LEFT, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("DocSubtitle", parent=styles["Normal"], fontSize=11, textColor=HexColor("#94a3b8"), spaceAfter=2, alignment=TA_LEFT))
styles.add(ParagraphStyle("SectionHead", parent=styles["Heading1"], fontSize=15, textColor=DARK, spaceBefore=20, spaceAfter=8, fontName="Helvetica-Bold", borderPadding=(0,0,4,0)))
styles.add(ParagraphStyle("SubHead", parent=styles["Heading2"], fontSize=12, textColor=ACCENT, spaceBefore=12, spaceAfter=4, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("Body", parent=styles["Normal"], fontSize=9.5, leading=14, textColor=HexColor("#334155"), alignment=TA_JUSTIFY, spaceAfter=6))
styles.add(ParagraphStyle("BulletItem", parent=styles["Body"], leftIndent=18, bulletIndent=6, spaceBefore=2, spaceAfter=2))
styles.add(ParagraphStyle("CodeText", parent=styles["Normal"], fontSize=8.5, fontName="Courier", textColor=HexColor("#7c3aed"), backColor=HexColor("#f5f3ff"), leftIndent=12, spaceBefore=4, spaceAfter=4, leading=12))
styles.add(ParagraphStyle("FileRef", parent=styles["Normal"], fontSize=8.5, fontName="Courier", textColor=GRAY, leftIndent=12, spaceAfter=2))
styles.add(ParagraphStyle("Label", parent=styles["Normal"], fontSize=8, fontName="Helvetica-Bold", textColor=GRAY, spaceBefore=8, spaceAfter=2))
styles.add(ParagraphStyle("TableCell", parent=styles["Normal"], fontSize=8.5, leading=11, textColor=HexColor("#334155")))
styles.add(ParagraphStyle("TableHeader", parent=styles["Normal"], fontSize=8.5, leading=11, textColor=WHITE, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("RecItem", parent=styles["Body"], leftIndent=18, bulletIndent=6, spaceBefore=4, spaceAfter=4))

def build_header_table():
    """Dark banner header"""
    data = [[
        Paragraph("DigitalDSA", styles["DocTitle"]),
    ], [
        Paragraph("Navigation &amp; UI Glitch Resolution Report", styles["DocSubtitle"]),
    ], [
        Paragraph("Session 46 | March 31, 2026 | Internal Technical Document", styles["DocSubtitle"]),
    ]]
    t = Table(data, colWidths=[WIDTH - 2*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), DARK),
        ("TOPPADDING", (0,0), (-1,0), 20),
        ("BOTTOMPADDING", (0,-1), (-1,-1), 16),
        ("LEFTPADDING", (0,0), (-1,-1), 24),
        ("RIGHTPADDING", (0,0), (-1,-1), 24),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    return t

def section_divider():
    return HRFlowable(width="100%", thickness=1, color=HexColor("#e2e8f0"), spaceBefore=6, spaceAfter=6)

def severity_badge(level):
    colors = {"High": RED, "Medium": AMBER, "Low": GREEN}
    c = colors.get(level, GRAY)
    return f'<font color="{c.hexval()}"><b>[{level}]</b></font>'

def issue_block(number, title, severity, problem, root_cause_items, resolution_items, files):
    elements = []
    elements.append(Paragraph(f"{number}. {title} &nbsp; {severity_badge(severity)}", styles["SectionHead"]))

    elements.append(Paragraph("<b>Problem</b>", styles["Label"]))
    elements.append(Paragraph(problem, styles["Body"]))

    elements.append(Paragraph("<b>Root Cause</b>", styles["Label"]))
    for item in root_cause_items:
        elements.append(Paragraph(f"\u2022 {item}", styles["BulletItem"]))

    elements.append(Paragraph("<b>Resolution</b>", styles["Label"]))
    for item in resolution_items:
        elements.append(Paragraph(f"\u2022 {item}", styles["BulletItem"]))

    elements.append(Paragraph("<b>Files Modified</b>", styles["Label"]))
    for f in files:
        elements.append(Paragraph(f, styles["FileRef"]))

    elements.append(section_divider())
    return elements

def build_summary_table():
    header = [
        Paragraph("Issue", styles["TableHeader"]),
        Paragraph("Severity", styles["TableHeader"]),
        Paragraph("Root Cause", styles["TableHeader"]),
        Paragraph("Fix Approach", styles["TableHeader"]),
    ]
    rows = [
        [
            Paragraph("Login/Logout page stacking", styles["TableCell"]),
            Paragraph('<font color="#dc2626"><b>High</b></font>', styles["TableCell"]),
            Paragraph("Un-awaited goto() + finally{} re-render race", styles["TableCell"]),
            Paragraph("await goto(), move state reset to catch{}", styles["TableCell"]),
        ],
        [
            Paragraph("Case Intake flash on reload", styles["TableCell"]),
            Paragraph('<font color="#d97706"><b>Medium</b></font>', styles["TableCell"]),
            Paragraph("SSR renders page 0, overlay only after hydration", styles["TableCell"]),
            Paragraph("formReady=false always, overlay in SSR HTML", styles["TableCell"]),
        ],
        [
            Paragraph("500 on how-can-we-help", styles["TableCell"]),
            Paragraph('<font color="#dc2626"><b>High</b></font>', styles["TableCell"]),
            Paragraph("Mutating deep-frozen schema objects", styles["TableCell"]),
            Paragraph("Clone items with spread before mutating", styles["TableCell"]),
        ],
        [
            Paragraph("Broken nav after 500 error", styles["TableCell"]),
            Paragraph('<font color="#d97706"><b>Medium</b></font>', styles["TableCell"]),
            Paragraph("goto() needs hydrated SvelteKit router", styles["TableCell"]),
            Paragraph('Use &lt;a href&gt; and window.location.href', styles["TableCell"]),
        ],
    ]
    data = [header] + rows
    col_widths = [1.4*inch, 0.7*inch, 2.1*inch, 2.1*inch]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), DARK),
        ("TEXTCOLOR", (0,0), (-1,0), WHITE),
        ("BACKGROUND", (0,1), (-1,-1), LIGHT_BG),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [LIGHT_BG, WHITE]),
        ("GRID", (0,0), (-1,-1), 0.5, HexColor("#e2e8f0")),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    return t

def build_pdf():
    output_path = "F:/TECH/DigitalDSA/REPOs/DigitalDSA-V3/docs/reviews/2026-03-31-navigation-glitch-report.pdf"
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=0.6*inch,
        bottomMargin=0.6*inch,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
    )

    story = []

    # Header
    story.append(build_header_table())
    story.append(Spacer(1, 16))

    # Executive Summary
    story.append(Paragraph("Executive Summary", styles["SectionHead"]))
    story.append(Paragraph(
        "This report documents four navigation and UI glitch issues identified and resolved in Session 46. "
        "Two were <b>High severity</b> (500 errors, page stacking) and two were <b>Medium severity</b> "
        "(visual flash, broken buttons). All issues stemmed from SvelteKit-specific timing and state "
        "management patterns. The fixes span 14 files with 139 lines added and 51 removed.",
        styles["Body"]
    ))
    story.append(section_divider())

    # Issue 1
    story.extend(issue_block(
        "1", "Login/Logout Page Stacking", "High",
        "After OTP verification and login, the login page remained visible on screen while the dashboard "
        "rendered below it, creating a stacked appearance. The same issue occurred on logout \u2014 the dashboard "
        "stayed visible with the login page appearing below it. Users had to scroll to see the dashboard.",
        [
            "All <font face='Courier' size='8.5'>goto()</font> calls in <font face='Courier' size='8.5'>loginWithRole()</font>, "
            "<font face='Courier' size='8.5'>restoreAccount()</font>, <font face='Courier' size='8.5'>startFresh()</font>, "
            "<font face='Courier' size='8.5'>handleLogout()</font>, and <font face='Courier' size='8.5'>handleDeleteAccount()</font> "
            "were <b>not awaited</b>.",
            "The <font face='Courier' size='8.5'>finally{}</font> blocks executed immediately after the un-awaited "
            "<font face='Courier' size='8.5'>goto()</font>, resetting <font face='Courier' size='8.5'>isWaiting = false</font> "
            "before navigation completed.",
            "This triggered a re-render of the current page component while SvelteKit was transitioning to the new route, "
            "causing both page components to exist in the DOM simultaneously.",
        ],
        [
            "Added <font face='Courier' size='8.5'>await</font> to all <font face='Courier' size='8.5'>goto()</font> calls \u2014 "
            "5 in login page, 3 in dashboard layout, 1 each in DemoBanner and DemoRestrictionModal.",
            "Removed <font face='Courier' size='8.5'>finally { isWaiting = false }</font> blocks. On successful navigation "
            "the component is destroyed, so state reset is unnecessary. Moved <font face='Courier' size='8.5'>isWaiting = false</font> "
            "to <font face='Courier' size='8.5'>catch{}</font> only (error recovery path).",
            "Logout on landing page changed from <font face='Courier' size='8.5'>goto('/login')</font> to "
            "<font face='Courier' size='8.5'>window.location.href = '/login'</font> for reliable hard navigation.",
        ],
        [
            "src/routes/(auth)/login/+page.svelte",
            "src/routes/dashboard/+layout.svelte",
            "src/lib/components/DemoBanner.svelte",
            "src/lib/components/DemoRestrictionModal.svelte",
        ]
    ))

    # Issue 2
    story.extend(issue_block(
        "2", "Case Intake Page Flash on Form Reload", "Medium",
        "When a user reloads any of the 6 loan form pages (home-loan, LAP, plot-loan, business-loan, "
        "personal-loan, professional-loan) mid-progress, the \"Case Intake\" page (page 0) flashed briefly "
        "before the resume modal appeared. The flash was visible long enough to be screenshot-captured. "
        "This happened even though the resume modal itself has a fully opaque overlay.",
        [
            "<b>Layer 1 \u2014 SSR always renders page 0:</b> The <font face='Courier' size='8.5'>+page.server.ts</font> "
            "evaluates <font face='Courier' size='8.5'>pageIndex=0</font> with empty answers. "
            "<font face='Courier' size='8.5'>currentPageIndex</font> initializes to 0 and "
            "<font face='Courier' size='8.5'>showResumeModal</font> starts <font face='Courier' size='8.5'>false</font>.",
            "<b>Layer 2 \u2014 onMount timing gap:</b> The resume modal is only triggered in "
            "<font face='Courier' size='8.5'>onMount()</font>, which runs AFTER the first render. "
            "During SSR and initial hydration, page 0 content is visible without any overlay.",
            "<b>Layer 3 \u2014 sessionStorage unavailable during SSR:</b> "
            "<font face='Courier' size='8.5'>formState.currentPageIndex</font> returns 0 during SSR "
            "(no sessionStorage on server), so the overlay gate evaluated to \"ready\" during server rendering.",
        ],
        [
            "Created <font face='Courier' size='8.5'>FormLoadingOverlay.svelte</font> \u2014 fully opaque fixed overlay "
            "(<font face='Courier' size='8.5'>position: fixed; inset: 0; z-index: 9999</font>) with a spinner. "
            "Supports dark mode via <font face='Courier' size='8.5'>:global(.dark)</font> selector.",
            "Added <font face='Courier' size='8.5'>formReady = $state(false)</font> to all 6 form pages \u2014 "
            "<b>always starts false</b> so the overlay is present in SSR HTML with zero hydration gap.",
            "<font face='Courier' size='8.5'>formReady</font> transitions to <font face='Courier' size='8.5'>true</font> "
            "at 4 code paths: (A) onMount when no saved progress, (B) edit mode, (C) restart/clear resume choice, "
            "(D) <font face='Courier' size='8.5'>.finally()</font> after <font face='Courier' size='8.5'>evaluateOnServer()</font> "
            "completes on resume.",
        ],
        [
            "src/lib/components/form-wizard/FormLoadingOverlay.svelte (NEW)",
            "src/routes/(app)/form/home-loan/+page.svelte",
            "src/routes/(app)/form/lap/+page.svelte",
            "src/routes/(app)/form/plot-loan/+page.svelte",
            "src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte",
            "src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte",
            "src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte",
        ]
    ))

    story.append(PageBreak())

    # Issue 3
    story.extend(issue_block(
        "3", "500 Error on /form/how-can-we-help Reload", "High",
        "Reloading the \"How Can We Help\" page (loan type selection) while authenticated always returned "
        "a 500 Internal Server Error. The error page showed no useful details \u2014 just \"No error details provided\" "
        "with code UNKNOWN_ERROR. The \"Go Home\" and \"Retry\" buttons on the error page had limited functionality.",
        [
            "<font face='Courier' size='8.5'>schemaUtils.ts</font> function "
            "<font face='Courier' size='8.5'>preprocessSchemaBindings()</font> was trying to set "
            "<font face='Courier' size='8.5'>item.bindsTo = ...</font> directly on the schema object.",
            "The <font face='Courier' size='8.5'>schemaLoader.ts</font> applies <font face='Courier' size='8.5'>deepFreeze()</font> "
            "to all cached schemas at startup to prevent accidental mutation.",
            "This caused <font face='Courier' size='8.5'>TypeError: Cannot add property bindsTo, object is not extensible</font> "
            "during SSR when the page component called <font face='Courier' size='8.5'>preprocessSchema()</font>.",
        ],
        [
            "Changed <font face='Courier' size='8.5'>processItem()</font> to clone each item with "
            "<font face='Courier' size='8.5'>{ ...item }</font> spread before mutating properties. "
            "The original frozen object is never touched.",
            "Added try-catch around the <font face='Courier' size='8.5'>Applicant.findOne()</font> DB query in "
            "<font face='Courier' size='8.5'>(app)/+layout.server.ts</font> so a MongoDB failure doesn't 500 the "
            "entire form route tree.",
        ],
        [
            "src/lib/utils/schemaUtils.ts",
            "src/routes/(app)/+layout.server.ts",
        ]
    ))

    # Issue 4
    story.extend(issue_block(
        "4", "Dashboard/Logout Buttons Broken After Error Recovery", "Medium",
        "After encountering a 500 error and clicking \"Go Home\" to return to the landing page, the Dashboard "
        "and Logout buttons in the navigation bar did nothing when clicked. The page appeared normal but "
        "these interactive elements were non-functional.",
        [
            "Both buttons used <font face='Courier' size='8.5'>goto()</font> (SvelteKit client-side navigation) "
            "which requires a fully hydrated SvelteKit router to function.",
            "The \"Go Home\" link on the error page uses <font face='Courier' size='8.5'>&lt;a href=\"/\"&gt;</font> "
            "(standard HTML navigation), which causes a full page load.",
            "After a full page load triggered by error recovery, SvelteKit's client-side router was not reliably "
            "initialized, causing <font face='Courier' size='8.5'>goto()</font> calls to fail silently.",
        ],
        [
            "Dashboard button changed from <font face='Courier' size='8.5'>&lt;button onclick={goto()}&gt;</font> "
            "to <font face='Courier' size='8.5'>&lt;a href={dashboardHref}&gt;</font> \u2014 works with or without "
            "JavaScript hydration.",
            "Logout changed to <font face='Courier' size='8.5'>window.location.href = '/login'</font> (hard navigation) "
            "with fallback cookie clearing (<font face='Courier' size='8.5'>document.cookie</font>) if the logout API fails.",
            "Removed unused <font face='Courier' size='8.5'>goto</font> import from FloatingNav.",
        ],
        [
            "src/lib/components/landing/FloatingNav.svelte",
        ]
    ))

    # Summary Table
    story.append(Paragraph("Summary", styles["SectionHead"]))
    story.append(build_summary_table())
    story.append(Spacer(1, 16))

    # Recommendations
    story.append(Paragraph("Recommendations for Team", styles["SectionHead"]))

    recs = [
        ("<b>Audit all goto() calls in try/finally blocks.</b> Any <font face='Courier' size='8.5'>goto()</font> "
         "inside a try block should be <font face='Courier' size='8.5'>await</font>ed. State resets "
         "(<font face='Courier' size='8.5'>isLoading = false</font>, etc.) should only happen in "
         "<font face='Courier' size='8.5'>catch{}</font>, never in <font face='Courier' size='8.5'>finally{}</font>, "
         "because on successful navigation the component is destroyed."),

        ("<b>Never mutate schema objects directly.</b> All schema preprocessing must clone before modifying. "
         "The <font face='Courier' size='8.5'>deepFreeze()</font> in schemaLoader catches this at runtime, but "
         "consider adding a lint rule or code review checklist item to prevent future occurrences."),

        ("<b>Prefer &lt;a href&gt; for critical navigation buttons.</b> Landing page nav buttons (Dashboard, "
         "Logout) should use standard HTML links rather than client-side <font face='Courier' size='8.5'>goto()</font>. "
         "This ensures they work even when SvelteKit's client router isn't fully initialized."),

        ("<b>SSR-safe loading states must default to \"loading\".</b> Any UI gate that depends on browser-only "
         "APIs (sessionStorage, localStorage) should default to the blocked/loading state during SSR. "
         "Initialize <font face='Courier' size='8.5'>$state(false)</font>, not "
         "<font face='Courier' size='8.5'>$state(browserCheck)</font>, and let "
         "<font face='Courier' size='8.5'>onMount</font> resolve the correct state."),

        ("<b>Add a handleError hook for better error visibility.</b> Currently the app has no "
         "<font face='Courier' size='8.5'>handleError</font> export in hooks.server.ts. Server-side errors "
         "show as \"No error details provided\". Adding a handleError hook with structured logging would "
         "make debugging significantly faster."),
    ]

    for i, rec in enumerate(recs):
        story.append(Paragraph(f"{i+1}. {rec}", styles["RecItem"]))

    story.append(Spacer(1, 20))
    story.append(section_divider())
    story.append(Paragraph(
        "Commits: <font face='Courier' size='8.5'>16bd85aa</font>, "
        "<font face='Courier' size='8.5'>87097129</font>, "
        "<font face='Courier' size='8.5'>c4b0c5e6</font>, "
        "<font face='Courier' size='8.5'>38a0aa6f</font> "
        "&nbsp;|&nbsp; 14 files changed &nbsp;|&nbsp; +139 / -51 lines &nbsp;|&nbsp; Type check: 0 errors",
        styles["Body"]
    ))

    doc.build(story)
    return output_path

if __name__ == "__main__":
    path = build_pdf()
    print(f"PDF generated: {path}")
