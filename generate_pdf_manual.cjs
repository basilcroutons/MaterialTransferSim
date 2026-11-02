const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT_PUBLIC = path.join(__dirname, 'public', 'Material_Transfer_Simulation_User_Manual.pdf');
const OUTPUT_ROOT = path.join(__dirname, 'Material_Transfer_Simulation_User_Manual.pdf');

function buildPDF() {
  console.log('Generating comprehensive PDF User Manual...');

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 45, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: 'Material Transfer Simulation System - Comprehensive User Manual',
      Author: 'E4D Planner Technical Documentation Team',
      Subject: 'Discrete Volumetric Simulation, Corridor Routing & Telemetry Guide',
      Keywords: 'material transfer, simulation, civil mining, haulage, logistics, E4D planner'
    }
  });

  const writeStreamPublic = fs.createWriteStream(OUTPUT_PUBLIC);
  doc.pipe(writeStreamPublic);

  const colors = {
    primary: '#0369a1',      // Ocean blue
    dark: '#0f172a',         // Slate 900
    text: '#1e293b',         // Slate 800
    muted: '#64748b',        // Slate 500
    border: '#cbd5e1',       // Slate 300
    lightBg: '#f8fafc',      // Slate 50
    calloutBg: '#f0f9ff',    // Sky 50
    calloutBorder: '#0284c7',// Sky 600
    accent: '#22c55e',       // Emerald 500
    tableHeaderBg: '#1e293b' // Slate 800
  };

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - 100; // 495.28 pt

  // Helper functions
  function checkSpace(neededHeight) {
    if (doc.y + neededHeight > pageHeight - 55) {
      doc.addPage();
    }
  }

  function drawTitle() {
    // Header banner bar
    doc.rect(50, doc.y, contentWidth, 5).fill(colors.primary);
    doc.moveDown(0.4);

    doc.font('Helvetica-Bold').fontSize(22).fillColor(colors.dark)
       .text('MATERIAL TRANSFER SIMULATION SYSTEM', { align: 'center' });
    
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.primary)
       .text('E4D PLANNER — USER MANUAL & OPERATIONAL REFERENCE GUIDE', { align: 'center' });
    
    doc.font('Helvetica').fontSize(9).fillColor(colors.muted)
       .text('Version 2.4 | Discrete Volumetric Simulation & Dynamic Haul Routing', { align: 'center' });
    
    doc.moveDown(0.6);
  }

  function drawCallout(title, text) {
    checkSpace(65);
    const startY = doc.y;
    const padding = 10;
    
    // We compute text height
    doc.font('Helvetica').fontSize(9.5);
    const fullText = (title ? `${title}: ` : '') + text;
    const textHeight = doc.heightOfString(fullText, { width: contentWidth - (padding * 2 + 6) });
    const boxHeight = textHeight + (padding * 2);

    doc.rect(50, startY, contentWidth, boxHeight).fill(colors.calloutBg);
    doc.rect(50, startY, 4, boxHeight).fill(colors.calloutBorder);
    doc.rect(50, startY, contentWidth, boxHeight).strokeColor(colors.border).lineWidth(0.5).stroke();

    doc.y = startY + padding;
    doc.x = 50 + padding + 4;
    
    if (title) {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(colors.primary).text(`${title}: `, { continued: true });
    }
    doc.font('Helvetica').fontSize(9.5).fillColor(colors.text).text(text, { width: contentWidth - (padding * 2 + 6) });

    doc.x = 50;
    doc.y = startY + boxHeight + 10;
  }

  function drawPlaceholder(title, dimensions, caption) {
    checkSpace(90);
    const startY = doc.y;
    const boxHeight = 70;

    doc.rect(50, startY, contentWidth, boxHeight).fill(colors.lightBg);
    
    // Draw dashed border manually
    doc.save()
       .strokeColor('#94a3b8')
       .lineWidth(1)
       .dash(4, { space: 3 })
       .rect(50, startY, contentWidth, boxHeight)
       .stroke()
       .restore();

    doc.y = startY + 16;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569')
       .text(`[IMAGE PLACEHOLDER: ${title.toUpperCase()}]`, { align: 'center' });
    
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(8.5).fillColor('#64748b')
       .text(`Recommended Dimensions: ${dimensions}`, { align: 'center' });

    doc.x = 50;
    doc.y = startY + boxHeight + 4;

    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(colors.muted)
       .text(caption, { align: 'center' });

    doc.moveDown(0.6);
  }

  function drawEmbeddedImage(imgPath, caption, width, height) {
    const fullPath = path.isAbsolute(imgPath) ? imgPath : path.join(__dirname, imgPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Image missing at ${fullPath}, using placeholder`);
      drawPlaceholder(caption, `${Math.round(width)}x${Math.round(height)}`, caption);
      return;
    }

    const neededSpace = height + 30;
    checkSpace(neededSpace);

    const xPos = 50 + (contentWidth - width) / 2;
    const startY = doc.y;

    // Draw image border / frame
    doc.rect(xPos - 1, startY - 1, width + 2, height + 2).strokeColor(colors.border).lineWidth(0.5).stroke();
    doc.image(fullPath, xPos, startY, { width, height });

    doc.y = startY + height + 5;
    doc.x = 50;
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(colors.muted)
       .text(caption, { align: 'center' });

    doc.moveDown(0.6);
  }

  function drawHeading1(text) {
    checkSpace(45);
    doc.moveDown(0.4);
    const startY = doc.y;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(colors.primary)
       .text(text);
    doc.moveDown(0.15);
    doc.rect(50, doc.y, contentWidth, 1).fill(colors.primary);
    doc.moveDown(0.4);
  }

  function drawHeading2(text) {
    checkSpace(35);
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(colors.dark)
       .text(text);
    doc.moveDown(0.2);
  }

  function drawHeading3(text) {
    checkSpace(25);
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#334155')
       .text(text);
    doc.moveDown(0.15);
  }

  function drawParagraph(text) {
    checkSpace(25);
    doc.font('Helvetica').fontSize(9.5).fillColor(colors.text)
       .text(text, { lineGap: 2.5 });
    doc.moveDown(0.3);
  }

  function drawBullet(title, body) {
    checkSpace(25);
    const bulletIndent = 16;
    doc.x = 50 + bulletIndent;
    
    // draw bullet circle
    doc.circle(50 + 6, doc.y + 5, 2).fill(colors.primary);

    if (title) {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(colors.dark)
         .text(`${title}: `, { continued: true, lineGap: 2 });
    }
    doc.font('Helvetica').fontSize(9.5).fillColor(colors.text)
       .text(body, { lineGap: 2 });

    doc.x = 50;
    doc.moveDown(0.25);
  }

  function drawTable(headers, rows, colWidths) {
    checkSpace(50);
    const startX = 50;
    const rowHeight = 22;

    // Header row
    let currentY = doc.y;
    doc.rect(startX, currentY, contentWidth, rowHeight).fill(colors.tableHeaderBg);

    let currentX = startX;
    headers.forEach((h, i) => {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
         .text(h, currentX + 6, currentY + 6, { width: colWidths[i] - 12 });
      currentX += colWidths[i];
    });

    currentY += rowHeight;

    // Data rows
    rows.forEach((row, rowIdx) => {
      // Estimate row height
      doc.font('Helvetica').fontSize(8.5);
      let maxHeight = rowHeight;
      row.forEach((cellText, colIdx) => {
        const textH = doc.heightOfString(cellText, { width: colWidths[colIdx] - 12 });
        if (textH + 12 > maxHeight) {
          maxHeight = textH + 12;
        }
      });

      if (currentY + maxHeight > pageHeight - 50) {
        doc.addPage();
        currentY = 50;
        // Re-draw header on next page
        doc.rect(startX, currentY, contentWidth, rowHeight).fill(colors.tableHeaderBg);
        let headerX = startX;
        headers.forEach((h, i) => {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
             .text(h, headerX + 6, currentY + 6, { width: colWidths[i] - 12 });
          headerX += colWidths[i];
        });
        currentY += rowHeight;
      }

      // Alternate background
      if (rowIdx % 2 === 1) {
        doc.rect(startX, currentY, contentWidth, maxHeight).fill(colors.lightBg);
      }
      doc.rect(startX, currentY, contentWidth, maxHeight).strokeColor(colors.border).lineWidth(0.5).stroke();

      currentX = startX;
      row.forEach((cell, i) => {
        doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(colors.text)
           .text(cell, currentX + 6, currentY + 6, { width: colWidths[i] - 12, lineGap: 1.5 });
        currentX += colWidths[i];
      });

      currentY += maxHeight;
    });

    doc.x = 50;
    doc.y = currentY + 10;
  }

  // --- DOCUMENT CONTENT GENERATION ---

  // Document Title & Purpose Banner
  drawTitle();
  drawCallout(
    'SYSTEM PURPOSE',
    'The E4D Planner Material Transfer Simulator is an engineering and logistics simulation environment designed to model bulk earthmoving, stockpile buffering, and haulage logistics across complex civil and mining projects. It combines an interactive cardinal routing canvas with a daily discrete simulation engine enforcing volume conservation, swell factors, and dynamic overflow throttleback constraints.'
  );

  // Table of Contents
  drawHeading1('Table of Contents');
  drawBullet('1. System Architecture & Node Topology', 'Core concepts, Excavations, Stockpiles, External sinks, and bulk swell factors.');
  drawBullet('2. Graphical User Interface Overview', 'Top global controls, Preset ribbon, interactive canvas, Inspector, and Telemetry tray.');
  drawBullet('3. Container Management & Canvas Mechanics', 'Creating, translating, deleting containers, and luminous selection halos.');
  drawBullet('4. Intelligent Proximity Snapping', 'Magnetic 24px proximity threshold with 12px gap margin and axis-isolated edge constraints.');
  drawBullet('5. Transfer Link Routing, Corridors & Badges', 'Manhattan 90° bends, 12px corridor separation, thousands notation rate badges.');
  drawBullet('6. Volumetric Simulation Engine & Overflow Rules', '30-day discrete projection, bulk swell ratios, Throttleback, and Headroom Hold.');
  drawBullet('7. Simulation Playback & Visual Telemetry', 'Timeline scrubber, dual-halo visual tracking (0.42 line / 0.52 card), multi-selection.');
  drawBullet('8. Batch Preset Ribbon', 'Bulk swell factors, stockpile capacity adjustments, and shift haul fleet multipliers.');
  drawBullet('9. CSV Data Model & Export Specifications', 'Complete schema tables for Model Configurations and 30-Day Daily Telemetry logs.');
  drawBullet('10. Quick Reference & Operational Shortcuts', 'Comprehensive keyboard and mouse interaction cheat sheet.');

  // 1. System Architecture
  drawHeading1('1. System Architecture & Node Topology');
  drawParagraph('The simulation model is constructed from three fundamental node types connected by directed haulage routes:');
  drawBullet('Excavation Nodes (Sources)', 'Active cut faces, quarry pits, or bulk borrow areas. Materials are excavated in in-situ bulk bank cubic meters (BCM) and transferred downline. Excavations steadily deplete over the 30-day simulation cycle.');
  drawBullet('Stockpile Nodes (Buffers)', 'Intermediate storage pads and buffer stockpiles (e.g., Stockpile A, Stockpile B). Stockpiles have defined starting volumes and strict maximum capacity ceilings. They handle inbound loose receipts and outbound reclaimed compaction.');
  drawBullet('External Destination Nodes (Sinks)', 'Final placement locations including offsite processing mills, engineered fills, or commercial sale terminals. These nodes possess effectively unbounded capacity.');

  drawEmbeddedImage('public/assets/aistudio/image_24defcc3.png', 'Figure 1.1: Stockpile Container Node Card displaying current volume, capacity threshold, and active bulk factors.', 220, 160);

  // 2. Graphical User Interface
  drawHeading1('2. Graphical User Interface Overview');
  drawParagraph('The workspace is structured into five intuitive operational zones designed for high productivity:');
  drawEmbeddedImage('public/assets/aistudio/image_32906e00.png', 'Figure 2.1: Top Global Control Bar featuring Import Model, Export Model, PDF Manual Download, and Playback Toggle.', 470, 20);

  drawBullet('Top Header Bar', 'Provides global actions including CSV Model Import, Comprehensive Export dialog, User Manual downloads (PDF and ODT), and the primary "Run Simulation & Play" toggle.');
  drawBullet('Batch Preset Bar', 'Positioned directly below the header. Enables one-click application of standard material swell presets (1.15x gravel/clay, 1.25x rock), capacity buffers, and shift multipliers.');
  drawBullet('Central Canvas Viewport', 'Infinite interactive spatial layout space. Supports smooth pan/zoom, magnetic container alignment, and graphical route authoring.');
  drawBullet('Right Inspector Panel', 'Contextual properties inspector. Displays volumetric metrics and bulk factors for selected containers, or fleet allocations for transfer routes.');
  drawBullet('Bottom Telemetry & Scrubber Tray', 'Active during Playback Mode. Hosts a 30-day timeline scrubber with speed controls and a real-time multi-series volume trends graph.');

  drawPlaceholder('Full Application Workspace Overview', '1920x1080', 'Figure 2.2: Overall Application Workspace with active project model and configuration panels.');

  // 3. Container Management
  drawHeading1('3. Container Management & Canvas Mechanics');
  drawParagraph('Containers represent physical site features and can be manipulated freely on the canvas:');
  drawBullet('Creating & Positioning', 'Add containers via the toolbar and reposition them by dragging anywhere on their body. Connected transfer links automatically update geometry in real time.');
  drawBullet('Container Halo Highlight', 'When a container is selected, it receives a wide, luminous outer halo with an opacity factor of 0.52. This soft halo is positioned behind the container card, ensuring that the simulation engine’s status border (green, amber, red) remains 100% visible and uncompromised.');
  drawBullet('Multi-Selection', 'Hold Ctrl (or Cmd on macOS) while clicking containers to select multiple facilities for synchronized batch updates or comparative telemetry tracking.');

  drawEmbeddedImage('public/assets/aistudio/image_040f2a72.png', 'Figure 3.1: Excavation Source Node Card showing in-situ reserves and initial volume.', 180, 230);

  // 4. Intelligent Proximity Snapping
  drawHeading1('4. Intelligent Proximity Snapping (12px Gap & 24px Threshold)');
  drawParagraph('To maintain clean, professional site layouts without requiring tedious manual pixel adjustments, the canvas features an intelligent proximity snapping engine:');
  drawBullet('Magnetic Proximity Range (24px)', 'When dragging a container, if any of its edges come within 24 pixels of a neighboring container boundary, magnetic snapping activates.');
  drawBullet('Target Separation Margin (12px)', 'Upon snapping, the container automatically aligns to maintain an exact 12px visual gap between adjacent edges.');
  drawBullet('Axis-Isolated Edge Snapping', 'Snapping acts independently on each coordinate axis. Bringing a container vertically downward towards another snaps its top/bottom edges into a 12px gap without displacing horizontal alignment, unless the horizontal edges are also independently within the 24px threshold.');

  drawPlaceholder('Magnetic Snapping Alignment Guide', '800x400', 'Figure 4.1: Side-specific snapping behavior maintaining clean 12px spacing without cross-axis interference.');

  // 5. Transfer Link Routing & Corridors
  drawHeading1('5. Transfer Link Routing, Corridor Separation & Rate Badges');
  drawParagraph('Material transfer routes define directed haulage corridors between nodes:');

  drawEmbeddedImage('public/assets/aistudio/image_51266522.png', 'Figure 5.1: Multi-link corridor routing showing parallel lane offsets and flow rate badges.', 440, 250);

  drawHeading2('5.1 Manhattan Orthogonal Routing & 12px Corridor Separation');
  drawParagraph('Routes automatically negotiate 90-degree orthogonal bends between container boundary ports. When multiple links traverse a common spatial corridor (such as concurrent inputs and outputs at a buffer stockpile), the engine automatically separates routes into distinct parallel lanes with a strict 12px corridor separation, preventing any overlapping lines.');

  drawHeading2('5.2 Dynamic Flow Rate Badges');
  drawParagraph('Every active transfer link displays a prominent pill badge displaying its planned or simulated daily flow rate in standardized thousands-notation (\'k\' notation, e.g. 1.50k for 1,500 m³/day):');

  drawEmbeddedImage('public/assets/aistudio/image_1a6fb2bf.png', 'Figure 5.2: Flow rate badges displayed along route segments in clean thousands notation.', 470, 75);

  drawHeading2('5.3 Operational Route Status Color Codes');
  drawTable(
    ['Status Indicator', 'Operational Definition & Engine Response'],
    [
      ['GREEN (Full Flow)', '100% of planned material volume is moving. Upstream source has ample reserves, haul fleet is fully utilized, and downstream receiver has adequate headroom.'],
      ['AMBER (Restricted)', 'Flow is throttled (1% to 99% of planned rate). Triggered when downstream stockpile approaches capacity and engages the Throttleback rule, or when source nears depletion.'],
      ['RED (Blocked / Halt)', '0% flow. Receiving stockpile is 100% full (overflow hold) or upstream source is completely exhausted. Haulage halts completely along this corridor.'],
      ['BLUE / SLATE (Idle)', 'Inactive route or unsimulated route segment outside active scheduling window.']
    ],
    [140, 355.28]
  );

  // 6. Volumetric Simulation Engine
  drawHeading1('6. Volumetric Simulation Engine & Overflow Rules');
  drawParagraph('The simulation engine calculates material movement in discrete 24-hour cycles across a 30-day projection envelope, enforcing physical laws of mass and volume:');

  drawHeading2('6.1 Volumetric Swell Ratios');
  drawParagraph('Material in-situ expands upon excavation into loose cubic meters (LCM) by the bulkInFactor (typically 1.15x to 1.30x). When stockpiled material is reclaimed and compacted into engineered fills, the bulkOutFactor is applied. The simulation guarantees strict volumetric balance across all transfers.');

  drawHeading2('6.2 Overflow Rule: Throttleback');
  drawParagraph('When a downstream stockpile is projected to exceed its maximum capacity on Day t, the simulation engine engages Upstream Throttleback:');
  drawBullet('1. Headroom Evaluation', 'AvailableSpace = CapacityMax - CurrentVolume.');
  drawBullet('2. Inflow Capping', 'Inbound material volume is capped exactly to match AvailableSpace plus any outbound discharge occurring on the same day.');
  drawBullet('3. Rate Restriction', 'Inbound route rates are curtailed proportionally, transitioning link indicators from green to amber.');
  drawBullet('4. Source Preservation', 'Upstream excavation nodes retain un-excavated material in bank volume, eliminating phantom material loss.');

  drawHeading2('6.3 Overflow Rule: Headroom Hold');
  drawParagraph('If a buffer stockpile reaches critical capacity with zero outbound relief, the simulation locks the container into a Headroom Hold state. Inbound haulage routes turn red, and backpressure propagates up the supply chain, alerting site engineers to assign additional hauling assets or expand offsite disposal capacity.');

  // 7. Simulation Playback & Telemetry
  drawHeading1('7. Simulation Playback & Interactive Telemetry Graph');
  drawParagraph('Clicking "Run Simulation & Play" executes the 30-day projection and transforms the interface into an interactive operational review deck:');

  drawEmbeddedImage('public/assets/aistudio/image_c4db6e47.png', 'Figure 7.1: Telemetry Graph panel showing multi-container volume trends and interactive legend toggles.', 260, 190);

  drawHeading2('7.1 Timeline Scrubber & Dynamic Animation');
  drawParagraph('The bottom timeline controls allow engineers to step through Day 1 to Day 30 at variable playback speeds (1x, 2x, 5x, 10x). As the timeline advances, container fill gauges update, route lines animate with moving dashed pulses matching flow velocity, and badges show instantaneous daily throughput.');

  drawHeading2('7.2 Interactive Graphline Highlighting & Dual-Halo Visual System');
  drawParagraph('To inspect specific critical paths amidst busy networks, the system implements a coordinated dual-halo highlight system:');
  drawBullet('Legend & Curve Selection', 'Clicking any container in the canvas, or clicking its corresponding entry in the telemetry graph legend, activates focused tracking.');
  drawBullet('Graphline Halo (0.42 Opacity)', 'The selected curve in the graph receives a soft, widened halo beneath the main line, instantly differentiating it from overlapping curves without losing color clarity.');
  drawBullet('Container Card Halo (0.52 Opacity)', 'Simultaneously, the matching container on the canvas displays a wide luminous halo behind its border, allowing immediate spatial identification across large site layouts.');
  drawBullet('Ctrl + Click Multi-Highlight', 'Hold Ctrl or Cmd to highlight two or more containers together, enabling direct visual comparison between interconnected excavations and buffer stockpiles.');
  drawBullet('Visibility Toggles', 'Use the eye/checkbox icons in the legend to hide unselected series completely, isolating high-priority bottlenecks.');

  // 8. Preset Bar
  drawHeading1('8. Preset Bar & Batch Configuration');
  drawParagraph('Located below the primary navigation bar, the Batch Preset Bar accelerates scenario planning:');
  drawBullet('Swell Presets', 'One-click toggling between Standard Gravel/Clay (1.15x swell), Blasted Rock (1.25x swell), and Saturated Wet Material (1.35x swell).');
  drawBullet('Capacity Buffers', 'Quickly scale all stockpile capacities up or down by 10%, 25%, or 50% to test wet weather delays or construction phase shifts.');
  drawBullet('Haul Fleet Multipliers', 'Instantly apply shift length adjustments (e.g., 10-hour single shift vs. 24-hour continuous haulage) to all active links.');

  drawEmbeddedImage('public/assets/aistudio/image_5390a7d5.png', 'Figure 8.1: Link Inspector and Batch Configuration panel for haul fleet adjustments.', 420, 95);

  // 9. CSV Data Model & Export
  drawHeading1('9. CSV Data Model & Export Specifications');
  drawParagraph('All simulation topologies and daily operational outputs are fully accessible through standard CSV import and export.');

  drawHeading2('9.1 Model Structure CSV Specification');
  drawTable(
    ['CSV Column', 'Description & Expected Values'],
    [
      ['record_type', 'NODE for container definitions, LINK for transfer haulage routes.'],
      ['id, name, type', 'Unique string identifier, display label, and entity type (excavation, stockpile, external).'],
      ['x, y', 'Canvas pixel coordinates of container top-left corner.'],
      ['initial_volume, max_capacity', 'Initial starting volume (m³) and maximum storage threshold (m³).'],
      ['bulk_in, bulk_out', 'Volumetric expansion factors (e.g. 1.15, 1.00).'],
      ['source_id, target_id, planned_rate', 'For LINK records: Origin node ID, destination node ID, and daily nominal haul capacity (m³/day).']
    ],
    [140, 355.28]
  );

  drawHeading2('9.2 Simulation Daily Telemetry CSV Specification');
  drawParagraph('Exported simulation audit logs provide complete 30-day discrete accounting:');
  drawBullet('day', 'Integer projection day (1 to 30).');
  drawBullet('container_id, container_name', 'Target facility identification.');
  drawBullet('start_volume, end_volume', 'Beginning and ending day volumes (m³).');
  drawBullet('total_inflow, total_outflow', 'Cumulative daily transfer volumes (m³).');
  drawBullet('utilization_pct', 'Stockpile volume as a percentage of maximum capacity.');
  drawBullet('operational_status', 'Operational status code (FULL_FLOW, RESTRICTED, OVERFLOW_HOLD, DEPLETED).');

  drawPlaceholder('CSV Export Configuration Modal', '650x450', 'Figure 9.1: CSV Export selection modal with Model Schema and Daily Telemetry export buttons.');

  // 10. Quick Reference & Shortcuts
  drawHeading1('10. Quick Reference & Operational Shortcuts');
  drawTable(
    ['Keyboard / Mouse Action', 'Operation & Result'],
    [
      ['Left Click Container', 'Select single container; open node inspector; trigger luminous 0.52 halo.'],
      ['Ctrl + Click (or Cmd + Click)', 'Multi-select containers or multi-highlight telemetry graph curves.'],
      ['Drag Container', 'Reposition on canvas with automatic 12px gap magnetic edge snapping (within 24px range).'],
      ['Middle Click / Space + Drag', 'Pan canvas viewport across infinite layout space.'],
      ['Mouse Wheel', 'Zoom canvas in and out centered on cursor.'],
      ['Click Route Line / Badge', 'Open route inspector to configure daily haul capacity and truck fleet allocation.'],
      ['Spacebar (Playback Mode)', 'Toggle simulation playback between Play and Pause.']
    ],
    [160, 335.28]
  );

  drawCallout('TECHNICAL SUPPORT & INQUIRIES', 'For operational assistance, batch schema customizations, or enterprise system integrations, please contact the E4D Planner Operations Team.');

  // Apply running footers to all pages
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    
    // Running footer rule
    doc.rect(50, pageHeight - 38, contentWidth, 0.5).fill(colors.border);
    
    // Footer text
    doc.font('Helvetica').fontSize(8).fillColor(colors.muted)
       .text('E4D Planner — Material Transfer Simulator User Manual', 50, pageHeight - 32, { align: 'left', width: 300 });
    
    doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.muted)
       .text(`Page ${i + 1} of ${totalPages}`, 50, pageHeight - 32, { align: 'right', width: contentWidth });
  }

  doc.end();

  writeStreamPublic.on('finish', () => {
    fs.copyFileSync(OUTPUT_PUBLIC, OUTPUT_ROOT);
    console.log(`Successfully generated PDF manual at:\n  - ${OUTPUT_PUBLIC}\n  - ${OUTPUT_ROOT}`);
    console.log(`Total Pages: ${totalPages}`);
  });
}

buildPDF();
