#!/usr/bin/env python3
"""
Generates the comprehensive User Manual for the Material Transfer Simulation System (E4D Planner)
as a genuine OpenDocument Text (.odt) file, compatible with OpenOffice Writer, LibreOffice Writer,
Microsoft Word, and Google Docs.

Embeds available derived visual screenshots from public/assets/aistudio/ into the ODT archive,
and provides styled placeholder text regions with exact dimensions, guidelines, and captions
for any additional screenshots the user may wish to insert.
"""

import os
import zipfile
import shutil
from datetime import datetime

ODT_OUTPUT_PATH = "public/Material_Transfer_Simulation_User_Manual.odt"
ROOT_ODT_PATH = "Material_Transfer_Simulation_User_Manual.odt"
MD_OUTPUT_PATH = "USER_MANUAL.md"

def build_odt_manual():
    print("Building OpenOffice User Manual (.odt)...")

    # Embedded images dictionary: {archive_path: host_path}
    embedded_images = {
        "Pictures/canvas_routes.png": "public/assets/aistudio/image_51266522.png",
        "Pictures/telemetry_graph.png": "public/assets/aistudio/image_c4db6e47.png",
        "Pictures/rate_badges.png": "public/assets/aistudio/image_1a6fb2bf.png",
        "Pictures/top_header.png": "public/assets/aistudio/image_32906e00.png",
        "Pictures/inspector_panel.png": "public/assets/aistudio/image_5390a7d5.png",
        "Pictures/container_card.png": "public/assets/aistudio/image_24defcc3.png",
        "Pictures/excavation_card.png": "public/assets/aistudio/image_040f2a72.png",
    }

    mimetype = "application/vnd.oasis.opendocument.text"

    # META-INF/manifest.xml
    manifest_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
'''
    for pic_name in embedded_images.keys():
        manifest_xml += f'  <manifest:file-entry manifest:full-path="{pic_name}" manifest:media-type="image/png"/>\n'
    manifest_xml += '</manifest:manifest>'

    # meta.xml
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    meta_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.2">
  <office:meta>
    <dc:title>Material Transfer Simulation System - Comprehensive User Manual</dc:title>
    <dc:description>Complete operational manual, simulation engine reference, UI guide, snapping mechanics, and CSV export specifications for the E4D Planner Material Transfer Simulator.</dc:description>
    <dc:creator>E4D Planner Technical Documentation Team</dc:creator>
    <meta:initial-creator>E4D Planner Technical Documentation Team</meta:initial-creator>
    <dc:date>{now_iso}</dc:date>
    <meta:creation-date>{now_iso}</meta:creation-date>
    <meta:keyword>material transfer</meta:keyword>
    <meta:keyword>simulation</meta:keyword>
    <meta:keyword>bulk handling</meta:keyword>
    <meta:keyword>stockpile</meta:keyword>
    <meta:keyword>corridor routing</meta:keyword>
    <meta:keyword>user manual</meta:keyword>
  </office:meta>
</office:document-meta>'''

    # styles.xml
    styles_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  office:version="1.2">
  <office:font-face-decls>
    <style:font-face style:name="Segoe UI" svg:font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"/>
    <style:font-face style:name="Consolas" svg:font-family="'Consolas', 'Courier New', monospace"/>
    <style:font-face style:name="Arial" svg:font-family="Arial, sans-serif"/>
  </office:font-face-decls>
  <office:styles>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:hyphenation-ladder-count="no-limit" style:text-autospace="ideograph-alpha" style:punctuation-wrap="hanging" style:line-break="strict"/>
      <style:text-properties style:use-window-font-color="true" style:font-name="Segoe UI" fo:font-size="10.5pt" fo:language="en" fo:country="US"/>
    </style:default-style>
    
    <style:style style:name="Standard" style:family="paragraph" style:class="text"/>
    
    <style:style style:name="DocumentTitle" style:family="paragraph" style:next-style-name="DocumentSubtitle">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.25cm" fo:text-align="center"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="24pt" fo:font-weight="bold" fo:color="#0f172a"/>
    </style:style>
    
    <style:style style:name="DocumentSubtitle" style:family="paragraph" style:next-style-name="BodyText">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.8cm" fo:text-align="center"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="12pt" fo:font-weight="normal" fo:color="#475569"/>
    </style:style>

    <style:style style:name="Heading_20_1" style:display-name="Heading 1" style:family="paragraph" style:next-style-name="BodyText">
      <style:paragraph-properties fo:margin-top="0.7cm" fo:margin-bottom="0.3cm" fo:keep-with-next="always" fo:border-bottom="1.5pt solid #0284c7" fo:padding-bottom="0.1cm"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="16pt" fo:font-weight="bold" fo:color="#0369a1"/>
    </style:style>

    <style:style style:name="Heading_20_2" style:display-name="Heading 2" style:family="paragraph" style:next-style-name="BodyText">
      <style:paragraph-properties fo:margin-top="0.5cm" fo:margin-bottom="0.2cm" fo:keep-with-next="always"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="13pt" fo:font-weight="bold" fo:color="#1e293b"/>
    </style:style>

    <style:style style:name="Heading_20_3" style:display-name="Heading 3" style:family="paragraph" style:next-style-name="BodyText">
      <style:paragraph-properties fo:margin-top="0.35cm" fo:margin-bottom="0.15cm" fo:keep-with-next="always"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="11pt" fo:font-weight="bold" fo:color="#334155"/>
    </style:style>

    <style:style style:name="BodyText" style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.25cm" fo:line-height="130%"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="10pt" fo:color="#1e293b"/>
    </style:style>

    <style:style style:name="BulletItem" style:family="paragraph">
      <style:paragraph-properties fo:margin-left="0.6cm" fo:margin-top="0.05cm" fo:margin-bottom="0.12cm" fo:line-height="125%"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="10pt" fo:color="#1e293b"/>
    </style:style>

    <style:style style:name="CalloutBox" style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0.3cm" fo:margin-bottom="0.4cm" fo:margin-left="0.3cm" fo:margin-right="0.3cm" fo:padding="0.3cm" fo:background-color="#f0f9ff" fo:border-left="3pt solid #0284c7" fo:border-top="0.5pt solid #bae6fd" fo:border-right="0.5pt solid #bae6fd" fo:border-bottom="0.5pt solid #bae6fd"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="9.5pt" fo:color="#0369a1"/>
    </style:style>

    <style:style style:name="PlaceholderBox" style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0.4cm" fo:margin-bottom="0.15cm" fo:margin-left="0.2cm" fo:margin-right="0.2cm" fo:padding="0.45cm" fo:background-color="#f8fafc" fo:border="1.5pt dashed #94a3b8" fo:text-align="center"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="9.5pt" fo:font-weight="bold" fo:color="#475569"/>
    </style:style>

    <style:style style:name="FigureCaption" style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0.1cm" fo:margin-bottom="0.45cm" fo:text-align="center"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="9pt" fo:font-style="italic" fo:color="#64748b"/>
    </style:style>

    <style:style style:name="CodeText" style:family="text">
      <style:text-properties style:font-name="Consolas" fo:font-size="9pt" fo:background-color="#e2e8f0" fo:color="#0f172a"/>
    </style:style>

    <style:style style:name="BoldText" style:family="text">
      <style:text-properties fo:font-weight="bold"/>
    </style:style>

    <style:style style:name="TableHead" style:family="paragraph">
      <style:paragraph-properties fo:margin="0.15cm" fo:text-align="left"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="9.5pt" fo:font-weight="bold" fo:color="#ffffff"/>
    </style:style>

    <style:style style:name="TableCell" style:family="paragraph">
      <style:paragraph-properties fo:margin="0.15cm" fo:text-align="left"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="9pt" fo:color="#1e293b"/>
    </style:style>
  </office:styles>
  <office:automatic-styles>
    <style:page-layout style:name="pm1">
      <style:page-layout-properties fo:page-width="21.0cm" fo:page-height="29.7cm" style:num-format="1" style:print-orientation="portrait" fo:margin-top="2.0cm" fo:margin-bottom="2.0cm" fo:margin-left="2.2cm" fo:margin-right="2.2cm"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="pm1"/>
  </office:master-styles>
</office:document-styles>'''

    # content.xml
    content_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  office:version="1.2">
  <office:scripts/>
  <office:font-face-decls>
    <style:font-face style:name="Segoe UI" svg:font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"/>
    <style:font-face style:name="Consolas" svg:font-family="'Consolas', 'Courier New', monospace"/>
    <style:font-face style:name="Arial" svg:font-family="Arial, sans-serif"/>
  </office:font-face-decls>
  <office:automatic-styles>
    <style:style style:name="Table1" style:family="table">
      <style:table-properties style:width="16.5cm" table:align="center" fo:margin-top="0.2cm" fo:margin-bottom="0.4cm"/>
    </style:style>
    <style:style style:name="Table1.ColHeader" style:family="table-column">
      <style:table-column-properties style:column-width="3.5cm"/>
    </style:style>
    <style:style style:name="Table1.ColBody" style:family="table-column">
      <style:table-column-properties style:column-width="13.0cm"/>
    </style:style>
    <style:style style:name="CellHeader" style:family="table-cell">
      <style:table-cell-properties fo:background-color="#0284c7" fo:padding="0.18cm" fo:border="0.5pt solid #cbd5e1"/>
    </style:style>
    <style:style style:name="CellNormal" style:family="table-cell">
      <style:table-cell-properties fo:background-color="#ffffff" fo:padding="0.18cm" fo:border="0.5pt solid #cbd5e1"/>
    </style:style>
    <style:style style:name="CellAlt" style:family="table-cell">
      <style:table-cell-properties fo:background-color="#f8fafc" fo:padding="0.18cm" fo:border="0.5pt solid #cbd5e1"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
      <!-- Title Page / Document Header -->
      <text:p text:style-name="DocumentTitle">MATERIAL TRANSFER SIMULATION SYSTEM</text:p>
      <text:p text:style-name="DocumentSubtitle">E4D Planner — Comprehensive User Manual &amp; Operational Reference Guide<br/>Version 2.4 | Discrete Volumetric Simulation &amp; Dynamic Haul Routing</text:p>

      <!-- Executive Overview Banner -->
      <text:p text:style-name="CalloutBox"><text:span text:style-name="BoldText">SYSTEM PURPOSE:</text:span> The E4D Planner Material Transfer Simulator is an engineering and logistics simulation environment designed to model bulk earthmoving, stockpile buffering, and haulage logistics across complex civil and mining projects. It combines an interactive cardinal routing canvas with a daily discrete simulation engine enforcing volume conservation, swell factors, and dynamic overflow throttleback constraints.</text:p>

      <!-- Table of Contents -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">Table of Contents</text:h>
      <text:p text:style-name="BulletItem">1. System Architecture &amp; Node Topology</text:p>
      <text:p text:style-name="BulletItem">2. Graphical User Interface Overview</text:p>
      <text:p text:style-name="BulletItem">3. Container Management &amp; Canvas Mechanics</text:p>
      <text:p text:style-name="BulletItem">4. Intelligent Proximity Snapping (12px Gap &amp; 24px Threshold)</text:p>
      <text:p text:style-name="BulletItem">5. Transfer Link Routing, Corridor Separation &amp; Rate Badges</text:p>
      <text:p text:style-name="BulletItem">6. Volumetric Simulation Engine &amp; Overflow Rules</text:p>
      <text:p text:style-name="BulletItem">7. Simulation Playback &amp; Interactive Telemetry Graph</text:p>
      <text:p text:style-name="BulletItem">8. Preset Bar &amp; Batch Configuration</text:p>
      <text:p text:style-name="BulletItem">9. CSV Data Model &amp; Export Specifications</text:p>
      <text:p text:style-name="BulletItem">10. Quick Reference &amp; Operational Shortcuts</text:p>

      <!-- Section 1 -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">1. System Architecture &amp; Node Topology</text:h>
      <text:p text:style-name="BodyText">The simulation model is constructed from three fundamental node types connected by directed haulage routes:</text:p>
      
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Excavation Nodes (Sources):</text:span> Represent active cut faces, pits, or quarry zones. Materials are excavated in in-situ bulk bank cubic meters (BCM) and transferred downline. Excavation containers deplete over the duration of the 30-day projection.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Stockpile Nodes (Buffers):</text:span> Intermediate buffer storage facilities (e.g., Stockpile A, Stockpile B). Stockpiles have defined starting volumes and maximum capacities. Stockpiles handle both inbound receipts (compacted or loose) and outbound re-handling.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">External Destination Nodes (Sinks):</text:span> Final placement zones such as offsite processing mills, engineered fills, or commercial sale terminals. These nodes possess effectively unbounded capacity or large operational thresholds.</text:p>

      <text:p text:style-name="BodyText">Each container holds granular properties for bulk transformation, capacity, and status:</text:p>

      <!-- Embedded Image: Container Card Detail -->
      <text:p text:style-name="BodyText">
        <draw:frame draw:name="fig_container_card" text:anchor-type="paragraph" svg:width="6.8cm" svg:height="5.4cm">
          <draw:image xlink:href="Pictures/container_card.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
        </draw:frame>
      </text:p>
      <text:p text:style-name="FigureCaption">Figure 1.1: Stockpile Container Node Card displaying current volume, capacity limit, and active bulk factors.</text:p>

      <!-- Section 2 -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">2. Graphical User Interface Overview</text:h>
      <text:p text:style-name="BodyText">The workspace consists of five integrated control zones:</text:p>
      
      <!-- Embedded Image: Top Header -->
      <text:p text:style-name="BodyText">
        <draw:frame draw:name="fig_top_header" text:anchor-type="paragraph" svg:width="16.5cm" svg:height="0.65cm">
          <draw:image xlink:href="Pictures/top_header.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
        </draw:frame>
      </text:p>
      <text:p text:style-name="FigureCaption">Figure 2.1: Top Global Control Bar featuring Import Model, Export Model, Manual Download, and Playback Mode Toggle.</text:p>

      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Top Header Bar:</text:span> Houses primary global commands: CSV Import, Comprehensive CSV Export Modal, User Manual download, and the primary "Run Simulation &amp; Play" toggle.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Batch Preset Bar:</text:span> Located directly beneath the top header. Allows one-click application of standardized parameters (e.g. Swell 1.15x / 1.25x, capacity scaling) across multiple selected or all containers simultaneously.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Central Canvas Viewport:</text:span> The primary spatial layout canvas. Supports smooth infinite panning (mouse drag or middle button), free zooming, container repositioning with magnetic snapping, and visual route authoring.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Right Inspector Panel:</text:span> Contextual properties editor. When a container is selected, displays volumetric metrics, bulk in/out swell ratios, and active inbound/outbound links. When a route line is clicked, displays fleet haulage rates and truck assignments.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Bottom Telemetry &amp; Scrubber Tray:</text:span> Appears in Playback Mode. Provides a 30-day timeline scrubber with play, pause, and speed adjustments alongside an interactive multi-line trend graph.</text:p>

      <!-- Screenshot Placeholder: Full Overview -->
      <text:p text:style-name="PlaceholderBox">[IMAGE PLACEHOLDER: Full Application Workspace Overview]<br/>Recommended Dimensions: 1920x1080 | Canvas showing complete flow with Inspector &amp; Batch Bar</text:p>
      <text:p text:style-name="FigureCaption">Figure 2.2: Overall Application Workspace with active project model and configuration panels.</text:p>

      <!-- Section 3 -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">3. Container Management &amp; Canvas Mechanics</text:h>
      <text:p text:style-name="BodyText">Containers represent physical storage locations or active work faces. Users can manipulate containers freely on the canvas:</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Creation:</text:span> Use the node addition toolbar to drop new Excavation, Stockpile, or External nodes onto the canvas.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Positioning &amp; Dragging:</text:span> Click and hold anywhere on a container's header or body to translate it across the canvas coordinate plane. Transfer routes update their orthogonal geometry in real-time.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Container Halo Highlight:</text:span> Selected containers receive a wide, soft outer glow (halo) with an opacity factor of <text:span text:style-name="CodeText">0.52</text:span>. This halo does not replace or obscure the simulation engine status border, allowing users to assess node operational health (green, amber, red) while maintaining prominent selection feedback.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Multi-Selection:</text:span> Hold <text:span text:style-name="CodeText">Ctrl</text:span> (or <text:span text:style-name="CodeText">Cmd</text:span> on macOS) while clicking containers to select multiple nodes simultaneously for batch updates or comparative telemetry tracking.</text:p>

      <!-- Section 4 -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">4. Intelligent Proximity Snapping (12px Gap &amp; 24px Threshold)</text:h>
      <text:p text:style-name="BodyText">To ensure neat, human-engineered canvas layouts without tedious manual alignment, the application features an intelligent side-specific magnetic snapping engine:</text:p>

      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Magnetic Proximity Range (24px):</text:span> When dragging a container, if any of its edges come within 24 pixels of a neighboring container's boundary, the snapping engine activates.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Target Separation Margin (12px):</text:span> Upon snapping, the dragged container smoothly latches to maintain an exact 12px aesthetic separation gap between adjacent edges.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Independent Axis &amp; Side-Specific Constraint:</text:span> Snapping operates independently on each axis. Bringing a container vertically downward towards another snaps the top/bottom edges into a 12px gap without forcing the horizontal left/right edges to align, unless the horizontal edges are also independently within the 24px threshold. This eliminates unwanted jumps across unaffected coordinates.</text:p>

      <!-- Screenshot Placeholder: Snapping Mechanics -->
      <text:p text:style-name="PlaceholderBox">[IMAGE PLACEHOLDER: Magnetic Snapping Alignment Guide]<br/>Recommended Dimensions: 800x400 | Visual showing two containers snapping with 12px gap highlight</text:p>
      <text:p text:style-name="FigureCaption">Figure 4.1: Side-specific snapping behavior maintaining clean 12px spacing without cross-axis interference.</text:p>

      <!-- Section 5 -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">5. Transfer Link Routing, Corridor Separation &amp; Rate Badges</text:h>
      <text:p text:style-name="BodyText">Material transfer links define directed haulage corridors between nodes:</text:p>

      <!-- Embedded Image: Canvas Routes -->
      <text:p text:style-name="BodyText">
        <draw:frame draw:name="fig_canvas_routes" text:anchor-type="paragraph" svg:width="15.5cm" svg:height="9.2cm">
          <draw:image xlink:href="Pictures/canvas_routes.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
        </draw:frame>
      </text:p>
      <text:p text:style-name="FigureCaption">Figure 5.1: Multi-link corridor routing showing parallel lane offsets and flow rate badges.</text:p>

      <text:h text:style-name="Heading_20_2" text:outline-level="2">5.1 Manhattan Orthogonal Routing &amp; 12px Corridor Separation</text:h>
      <text:p text:style-name="BodyText">Routes automatically negotiate 90-degree orthogonal bends between container boundary ports. When multiple transfer links share a common spatial corridor (such as multiple haulage streams departing or entering the same stockpile), the engine automatically assigns each route a distinct parallel lane with a strict <text:span text:style-name="BoldText">12px corridor separation</text:span>. This guarantees routes never visually overlap or occlude one another.</text:p>

      <text:h text:style-name="Heading_20_2" text:outline-level="2">5.2 Dynamic Flow Rate Badges</text:h>
      <text:p text:style-name="BodyText">Every active transfer link renders a high-contrast pill badge displaying its planned or simulated transfer rate in standardized thousands-notation ('k' notation, e.g. <text:span text:style-name="CodeText">1.50k</text:span> for 1,500 m³/day):</text:p>

      <!-- Embedded Image: Rate Badges -->
      <text:p text:style-name="BodyText">
        <draw:frame draw:name="fig_rate_badges" text:anchor-type="paragraph" svg:width="16.0cm" svg:height="2.7cm">
          <draw:image xlink:href="Pictures/rate_badges.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
        </draw:frame>
      </text:p>
      <text:p text:style-name="FigureCaption">Figure 5.2: Flow rate badges displayed along route segments in clean 'k' notation.</text:p>

      <text:p text:style-name="BodyText">Rate badges are algorithmically positioned along straight route segments and offset across distinct lanes so they never collide with container borders or neighboring link badges.</text:p>

      <text:h text:style-name="Heading_20_2" text:outline-level="2">5.3 Operational Route Status Color Codes</text:h>
      
      <!-- Table of Status Colors -->
      <table:table table:name="StatusTable" table:style-name="Table1">
        <table:table-column table:style-name="Table1.ColHeader"/>
        <table:table-column table:style-name="Table1.ColBody"/>
        <table:table-header-rows>
          <table:table-row>
            <table:table-cell table:style-name="CellHeader"><text:p text:style-name="TableHead">Status Indicator</text:p></table:table-cell>
            <table:table-cell table:style-name="CellHeader"><text:p text:style-name="TableHead">Operational Definition &amp; Engine Response</text:p></table:table-cell>
          </table:table-row>
        </table:table-header-rows>
        <table:table-row>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">GREEN (Full Flow)</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell">100% of planned material volume is flowing without restriction. Upstream source has ample material, haul fleet is operating at peak capacity, and downstream receiver has adequate headroom.</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">AMBER (Restricted)</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell">Flow is throttled (1% to 99% of planned rate). Occurs when a downstream stockpile is approaching maximum capacity and invokes the Throttleback rule, or when upstream source is nearing depletion.</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">RED (Blocked / Halt)</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell">0% flow. The downstream receiving stockpile is 100% full (overflow condition) or the upstream source is completely depleted. Haulage halts completely along this corridor.</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">BLUE / SLATE (Idle)</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell">Inactive corridor or unsimulated route segment outside active scheduling window.</text:p></table:table-cell>
        </table:table-row>
      </table:table>

      <!-- Section 6 -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">6. Volumetric Simulation Engine &amp; Overflow Rules</text:h>
      <text:p text:style-name="BodyText">The mathematical simulation core evaluates material flow in discrete 24-hour cycles across a 30-day projection envelope. It rigorously computes bulk density and volume expansions:</text:p>

      <text:h text:style-name="Heading_20_2" text:outline-level="2">6.1 Volumetric Swell Ratios</text:h>
      <text:p text:style-name="BodyText">Material in-situ (bank cubic meters) expands upon excavation into loose cubic meters (LCM) by the <text:span text:style-name="CodeText">bulkInFactor</text:span> (typically 1.15x to 1.30x). When stockpiled material is reclaimed and compacted into engineered fills, the <text:span text:style-name="CodeText">bulkOutFactor</text:span> is applied. The simulation guarantees strict volumetric balance across all transfers.</text:p>

      <text:h text:style-name="Heading_20_2" text:outline-level="2">6.2 Overflow Rule: Throttleback</text:h>
      <text:p text:style-name="BodyText">When a downstream stockpile is projected to exceed its maximum capacity on Day <text:span text:style-name="CodeText">t</text:span>, the simulation engine engages <text:span text:style-name="BoldText">Upstream Throttleback</text:span>:</text:p>
      <text:p text:style-name="BulletItem">1. The engine calculates remaining headroom: <text:span text:style-name="CodeText">AvailableSpace = CapacityMax - CurrentVolume</text:span>.</text:p>
      <text:p text:style-name="BulletItem">2. Inflow is capped exactly to match AvailableSpace plus any outbound discharge occurring in the same step.</text:p>
      <text:p text:style-name="BulletItem">3. Inbound transfer link rates are curtailed proportionally, transitioning link indicators from green to amber.</text:p>
      <text:p text:style-name="BulletItem">4. Upstream excavation nodes retain un-excavated material in bank volume, preventing phantom loss.</text:p>

      <text:h text:style-name="Heading_20_2" text:outline-level="2">6.3 Overflow Rule: Headroom Hold</text:h>
      <text:p text:style-name="BodyText">If a buffer stockpile reaches critical capacity with zero outbound relief, the simulation locks the container into a <text:span text:style-name="BoldText">Headroom Hold</text:span> state. Inbound haulage routes turn red, and backpressure propagates up the supply chain, alerting site engineers to assign additional hauling assets or expand offsite disposal capacity.</text:p>

      <!-- Section 7 -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">7. Simulation Playback &amp; Interactive Telemetry Graph</text:h>
      <text:p text:style-name="BodyText">Clicking <text:span text:style-name="BoldText">Run Simulation &amp; Play</text:span> executes the 30-day projection and transforms the interface into an interactive operational review deck:</text:p>

      <!-- Embedded Image: Telemetry Graph -->
      <text:p text:style-name="BodyText">
        <draw:frame draw:name="fig_telemetry_graph" text:anchor-type="paragraph" svg:width="11.0cm" svg:height="8.5cm">
          <draw:image xlink:href="Pictures/telemetry_graph.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
        </draw:frame>
      </text:p>
      <text:p text:style-name="FigureCaption">Figure 7.1: Telemetry Graph panel showing multi-container volume trends and interactive legend toggles.</text:p>

      <text:h text:style-name="Heading_20_2" text:outline-level="2">7.1 Timeline Scrubber &amp; Stepping</text:h>
      <text:p text:style-name="BodyText">The bottom timeline controls allow engineers to step through Day 1 to Day 30 at variable playback speeds (1x, 2x, 5x, 10x). As the timeline advances:</text:p>
      <text:p text:style-name="BulletItem">Every container card dynamically updates its real-time fill level and volumetric percentage bar.</text:p>
      <text:p text:style-name="BulletItem">Route lines animate with moving dashed pulses matching simulated flow velocity.</text:p>
      <text:p text:style-name="BulletItem">Route badges update their instantaneous daily throughput values.</text:p>

      <text:h text:style-name="Heading_20_2" text:outline-level="2">7.2 Interactive Graphline Highlighting &amp; Dual-Halo Visual System</text:h>
      <text:p text:style-name="BodyText">To inspect specific critical paths amidst busy networks, the system implements a coordinated dual-halo highlight system:</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Legend &amp; Curve Selection:</text:span> Clicking any container in the canvas, or clicking its corresponding entry in the telemetry graph legend, activates focused tracking.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Graphline Halo (0.42 Opacity):</text:span> The selected curve in the graph receives a soft, widened halo beneath the main line, instantly differentiating it from overlapping curves without losing color clarity.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Container Card Halo (0.52 Opacity):</text:span> Simultaneously, the matching container on the canvas displays a wide luminous halo behind its border, allowing immediate spatial identification across large site layouts.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Ctrl + Click Multi-Highlight:</text:span> Hold <text:span text:style-name="CodeText">Ctrl</text:span> or <text:span text:style-name="CodeText">Cmd</text:span> to highlight two or more containers together, enabling direct visual comparison between interconnected excavations and buffer stockpiles.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Visibility Toggles:</text:span> Use the eye/checkbox icons in the legend to hide unselected series completely, isolating high-priority bottlenecks.</text:p>

      <!-- Section 8 -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">8. Preset Bar &amp; Batch Configuration</text:h>
      <text:p text:style-name="BodyText">Located below the primary navigation bar, the Batch Preset Bar accelerates scenario planning:</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Swell Presets:</text:span> One-click toggling between Standard Gravel/Clay (1.15x swell), Blasted Rock (1.25x swell), and Saturated Wet Material (1.35x swell).</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Capacity Buffers:</text:span> Quickly scale all stockpile capacities up or down by 10%, 25%, or 50% to test wet weather delays or construction phase shifts.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="BoldText">Haul Fleet Multipliers:</text:span> Instantly apply shift length adjustments (e.g., 10-hour single shift vs. 24-hour continuous haulage) to all active links.</text:p>

      <!-- Section 9 -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">9. CSV Data Model &amp; Export Specifications</text:h>
      <text:p text:style-name="BodyText">All simulation topologies and daily operational outputs are fully accessible through standard CSV import and export.</text:p>

      <text:h text:style-name="Heading_20_2" text:outline-level="2">9.1 Model Structure CSV Specification</text:h>
      <text:p text:style-name="BodyText">The configuration CSV contains node definitions, physical coordinates, capacities, swell factors, and transfer links:</text:p>
      
      <!-- Model CSV Table -->
      <table:table table:name="CsvTable" table:style-name="Table1">
        <table:table-column table:style-name="Table1.ColHeader"/>
        <table:table-column table:style-name="Table1.ColBody"/>
        <table:table-header-rows>
          <table:table-row>
            <table:table-cell table:style-name="CellHeader"><text:p text:style-name="TableHead">CSV Column</text:p></table:table-cell>
            <table:table-cell table:style-name="CellHeader"><text:p text:style-name="TableHead">Description &amp; Expected Values</text:p></table:table-cell>
          </table:table-row>
        </table:table-header-rows>
        <table:table-row>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell"><text:span text:style-name="CodeText">record_type</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">NODE</text:span> for container definitions, <text:span text:style-name="BoldText">LINK</text:span> for transfer haulage routes.</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell"><text:span text:style-name="CodeText">id, name, type</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell">Unique string identifier, display label, and entity type ('excavation', 'stockpile', 'external').</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell"><text:span text:style-name="CodeText">x, y</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell">Canvas pixel coordinates of container top-left corner.</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell"><text:span text:style-name="CodeText">initial_volume, max_capacity</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell">Initial starting volume (m³) and maximum storage threshold (m³).</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell"><text:span text:style-name="CodeText">bulk_in, bulk_out</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell">Volumetric expansion factors (e.g. 1.15, 1.00).</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell"><text:span text:style-name="CodeText">source_id, target_id, planned_rate</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell">For LINK records: Origin node ID, destination node ID, and daily nominal haul capacity (m³/day).</text:p></table:table-cell>
        </table:table-row>
      </table:table>

      <text:h text:style-name="Heading_20_2" text:outline-level="2">9.2 Simulation Daily Telemetry CSV Specification</text:h>
      <text:p text:style-name="BodyText">Exported simulation audit logs provide complete 30-day discrete accounting:</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="CodeText">day</text:span>: Integer projection day (1 to 30).</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="CodeText">container_id, container_name</text:span>: Target facility identification.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="CodeText">start_volume, end_volume</text:span>: Beginning and ending day volumes (m³).</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="CodeText">total_inflow, total_outflow</text:span>: Cumulative daily transfer volumes (m³).</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="CodeText">utilization_pct</text:span>: Stockpile volume as a percentage of maximum capacity.</text:p>
      <text:p text:style-name="BulletItem"><text:span text:style-name="CodeText">operational_status</text:span>: Operational status code ('FULL_FLOW', 'RESTRICTED', 'OVERFLOW_HOLD', 'DEPLETED').</text:p>

      <!-- Screenshot Placeholder: Export Dialog -->
      <text:p text:style-name="PlaceholderBox">[IMAGE PLACEHOLDER: CSV Export Configuration Modal]<br/>Recommended Dimensions: 650x450 | Modal dialog showing Export Options for Model and Simulation Logs</text:p>
      <text:p text:style-name="FigureCaption">Figure 9.1: CSV Export selection modal with Model Schema and Daily Telemetry export buttons.</text:p>

      <!-- Section 10 -->
      <text:h text:style-name="Heading_20_1" text:outline-level="1">10. Quick Reference &amp; Operational Shortcuts</text:h>
      
      <!-- Shortcut Table -->
      <table:table table:name="ShortcutsTable" table:style-name="Table1">
        <table:table-column table:style-name="Table1.ColHeader"/>
        <table:table-column table:style-name="Table1.ColBody"/>
        <table:table-header-rows>
          <table:table-row>
            <table:table-cell table:style-name="CellHeader"><text:p text:style-name="TableHead">Keyboard / Mouse Action</text:p></table:table-cell>
            <table:table-cell table:style-name="CellHeader"><text:p text:style-name="TableHead">Operation &amp; Result</text:p></table:table-cell>
          </table:table-row>
        </table:table-header-rows>
        <table:table-row>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">Left Click Container</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell">Select single container; open node inspector; trigger luminous 0.52 halo.</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">Ctrl + Click (or Cmd + Click)</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell">Multi-select containers or multi-highlight telemetry graph curves.</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">Drag Container</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell">Reposition on canvas with automatic 12px gap magnetic edge snapping (within 24px range).</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">Middle Click / Space + Drag</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell">Pan canvas viewport across infinite layout space.</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">Mouse Wheel</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell">Zoom canvas in and out centered on cursor.</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">Click Route Line / Badge</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellAlt"><text:p text:style-name="TableCell">Open route inspector to configure daily haul capacity and truck fleet allocation.</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell"><text:span text:style-name="BoldText">Spacebar (Playback Mode)</text:span></text:p></table:table-cell>
          <table:table-cell table:style-name="CellNormal"><text:p text:style-name="TableCell">Toggle simulation playback between Play and Pause.</text:p></table:table-cell>
        </table:table-row>
      </table:table>

      <text:p text:style-name="CalloutBox"><text:span text:style-name="BoldText">TECHNICAL SUPPORT &amp; INQUIRIES:</text:span> For operational assistance, batch schema customizations, or enterprise system integrations, please contact the E4D Planner Operations Team.</text:p>

    </office:text>
  </office:body>
</office:document-content>'''

    # Create the zip archive
    temp_zip = "/tmp/user_manual.odt"
    with zipfile.ZipFile(temp_zip, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        # mimetype must be stored uncompressed as the first entry
        z.writestr("mimetype", mimetype, compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/manifest.xml", manifest_xml)
        z.writestr("meta.xml", meta_xml)
        z.writestr("styles.xml", styles_xml)
        z.writestr("content.xml", content_xml)

        # Copy pictures into Pictures/ in the zip
        for zip_pic_path, local_pic_path in embedded_images.items():
            if os.path.exists(local_pic_path):
                z.write(local_pic_path, zip_pic_path)
                print(f"  Embedded picture: {local_pic_path} -> {zip_pic_path}")
            else:
                print(f"  Warning: Picture not found at {local_pic_path}")

    # Copy output to both public and workspace root
    os.makedirs(os.path.dirname(ODT_OUTPUT_PATH), exist_ok=True)
    shutil.copyfile(temp_zip, ODT_OUTPUT_PATH)
    shutil.copyfile(temp_zip, ROOT_ODT_PATH)
    print(f"Created ODT at {ODT_OUTPUT_PATH} and {ROOT_ODT_PATH} ({os.path.getsize(ODT_OUTPUT_PATH)} bytes)")

    # Also build a clean markdown version
    md_content = """# Material Transfer Simulation System (E4D Planner)
## Comprehensive User Manual & Operational Reference Guide
*Version 2.4 | Discrete Volumetric Simulation & Dynamic Haul Routing*

---

### Executive Overview
The **E4D Planner Material Transfer Simulator** is an engineering and logistics simulation environment designed to model bulk earthmoving, stockpile buffering, and haulage logistics across complex civil and mining projects. It combines an interactive cardinal routing canvas with a daily discrete simulation engine enforcing volume conservation, swell factors, and dynamic overflow throttleback constraints.

---

## 1. System Architecture & Node Topology

The simulation model is constructed from three fundamental node types connected by directed haulage routes:

- **Excavation Nodes (Sources)**: Represent active cut faces, pits, or quarry zones. Materials are excavated in in-situ bulk bank cubic meters (BCM) and transferred downline. Excavation containers deplete over the duration of the 30-day projection.
- **Stockpile Nodes (Buffers)**: Intermediate buffer storage facilities (e.g., Stockpile A, Stockpile B). Stockpiles have defined starting volumes and maximum capacities. Stockpiles handle both inbound receipts (compacted or loose) and outbound re-handling.
- **External Destination Nodes (Sinks)**: Final placement zones such as offsite processing mills, engineered fills, or commercial sale terminals. These nodes possess effectively unbounded capacity or large operational thresholds.

### Node Property Reference
Each container holds granular properties for bulk transformation, capacity, and status:
- `initial_volume`: Starting material volume (m³).
- `max_capacity`: Maximum permissible physical stockpile capacity (m³).
- `bulk_in`: Swell factor applied upon inbound receipt (e.g., 1.15x for gravel/clay).
- `bulk_out`: Factor applied upon outbound reclaiming.

*(Embedded in OpenOffice Document: Figure 1.1 — Stockpile Container Node Card)*

---

## 2. Graphical User Interface Overview

The workspace consists of five integrated control zones:

1. **Top Header Bar**: Houses primary global commands: CSV Import, Comprehensive CSV Export Modal, User Manual download, and the primary "Run Simulation & Play" toggle.
2. **Batch Preset Bar**: Located directly beneath the top header. Allows one-click application of standardized parameters (e.g. Swell 1.15x / 1.25x, capacity scaling) across multiple selected or all containers simultaneously.
3. **Central Canvas Viewport**: The primary spatial layout canvas. Supports smooth infinite panning, free zooming, container repositioning with magnetic snapping, and visual route authoring.
4. **Right Inspector Panel**: Contextual properties editor. When a container is selected, displays volumetric metrics, bulk in/out swell ratios, and active inbound/outbound links. When a route line is clicked, displays fleet haulage rates and truck assignments.
5. **Bottom Telemetry & Scrubber Tray**: Appears in Playback Mode. Provides a 30-day timeline scrubber with play, pause, and speed adjustments alongside an interactive multi-line trend graph.

*(Embedded in OpenOffice Document: Figure 2.1 — Top Global Control Bar)*
*(Placeholder in OpenOffice Document: Figure 2.2 — Overall Application Workspace)*

---

## 3. Container Management & Canvas Mechanics

Containers represent physical storage locations or active work faces. Users can manipulate containers freely on the canvas:

- **Creation**: Use the node addition toolbar to drop new Excavation, Stockpile, or External nodes onto the canvas.
- **Positioning & Dragging**: Click and hold anywhere on a container's header or body to translate it across the canvas coordinate plane. Transfer routes update their orthogonal geometry in real-time.
- **Container Halo Highlight**: Selected containers receive a wide, soft outer glow (halo) with an opacity factor of `0.52`. This halo does not replace or obscure the simulation engine status border, allowing users to assess node operational health (green, amber, red) while maintaining prominent selection feedback.
- **Multi-Selection**: Hold `Ctrl` (or `Cmd` on macOS) while clicking containers to select multiple nodes simultaneously for batch updates or comparative telemetry tracking.

---

## 4. Intelligent Proximity Snapping (12px Gap & 24px Threshold)

To ensure neat, human-engineered canvas layouts without tedious manual alignment, the application features an intelligent side-specific magnetic snapping engine:

- **Magnetic Proximity Range (24px)**: When dragging a container, if any of its edges come within 24 pixels of a neighboring container's boundary, the snapping engine activates.
- **Target Separation Margin (12px)**: Upon snapping, the dragged container smoothly latches to maintain an exact 12px aesthetic separation gap between adjacent edges.
- **Independent Axis & Side-Specific Constraint**: Snapping operates independently on each axis. Bringing a container vertically downward towards another snaps the top/bottom edges into a 12px gap without forcing the horizontal left/right edges to align, unless the horizontal edges are also independently within the 24px threshold. This eliminates unwanted jumps across unaffected coordinates.

*(Placeholder in OpenOffice Document: Figure 4.1 — Magnetic Snapping Alignment Guide)*

---

## 5. Transfer Link Routing, Corridor Separation & Rate Badges

Material transfer links define directed haulage corridors between nodes.

### 5.1 Manhattan Orthogonal Routing & 12px Corridor Separation
Routes automatically negotiate 90-degree orthogonal bends between container boundary ports. When multiple transfer links share a common spatial corridor (such as multiple haulage streams departing or entering the same stockpile), the engine automatically assigns each route a distinct parallel lane with a strict **12px corridor separation**. This guarantees routes never visually overlap or occlude one another.

### 5.2 Dynamic Flow Rate Badges
Every active transfer link renders a high-contrast pill badge displaying its planned or simulated transfer rate in standardized thousands-notation ('k' notation, e.g. `1.50k` for 1,500 m³/day).
Rate badges are algorithmically positioned along straight route segments and offset across distinct lanes so they never collide with container borders or neighboring link badges.

*(Embedded in OpenOffice Document: Figure 5.1 — Multi-link corridor routing)*
*(Embedded in OpenOffice Document: Figure 5.2 — Flow rate badges in 'k' notation)*

### 5.3 Operational Route Status Color Codes
| Status Indicator | Operational Definition & Engine Response |
| :--- | :--- |
| **GREEN (Full Flow)** | 100% of planned material volume is flowing without restriction. Upstream source has ample material, haul fleet is operating at peak capacity, and downstream receiver has adequate headroom. |
| **AMBER (Restricted)** | Flow is throttled (1% to 99% of planned rate). Occurs when a downstream stockpile is approaching maximum capacity and invokes the Throttleback rule, or when upstream source is nearing depletion. |
| **RED (Blocked / Halt)** | 0% flow. The downstream receiving stockpile is 100% full (overflow condition) or the upstream source is completely depleted. Haulage halts completely along this corridor. |
| **BLUE / SLATE (Idle)** | Inactive corridor or unsimulated route segment outside active scheduling window. |

---

## 6. Volumetric Simulation Engine & Overflow Rules

The mathematical simulation core evaluates material flow in discrete 24-hour cycles across a 30-day projection envelope. It rigorously computes bulk density and volume expansions:

### 6.1 Volumetric Swell Ratios
Material in-situ (bank cubic meters) expands upon excavation into loose cubic meters (LCM) by the `bulkInFactor` (typically 1.15x to 1.30x). When stockpiled material is reclaimed and compacted into engineered fills, the `bulkOutFactor` is applied. The simulation guarantees strict volumetric balance across all transfers.

### 6.2 Overflow Rule: Throttleback
When a downstream stockpile is projected to exceed its maximum capacity on Day $t$, the simulation engine engages **Upstream Throttleback**:
1. The engine calculates remaining headroom: `AvailableSpace = CapacityMax - CurrentVolume`.
2. Inflow is capped exactly to match AvailableSpace plus any outbound discharge occurring in the same step.
3. Inbound transfer link rates are curtailed proportionally, transitioning link indicators from green to amber.
4. Upstream excavation nodes retain un-excavated material in bank volume, preventing phantom loss.

### 6.3 Overflow Rule: Headroom Hold
If a buffer stockpile reaches critical capacity with zero outbound relief, the simulation locks the container into a **Headroom Hold** state. Inbound haulage routes turn red, and backpressure propagates up the supply chain, alerting site engineers to assign additional hauling assets or expand offsite disposal capacity.

---

## 7. Simulation Playback & Interactive Telemetry Graph

Clicking **Run Simulation & Play** executes the 30-day projection and transforms the interface into an interactive operational review deck:

### 7.1 Timeline Scrubber & Stepping
The bottom timeline controls allow engineers to step through Day 1 to Day 30 at variable playback speeds (1x, 2x, 5x, 10x). As the timeline advances:
- Every container card dynamically updates its real-time fill level and volumetric percentage bar.
- Route lines animate with moving dashed pulses matching simulated flow velocity.
- Route badges update their instantaneous daily throughput values.

### 7.2 Interactive Graphline Highlighting & Dual-Halo Visual System
To inspect specific critical paths amidst busy networks, the system implements a coordinated dual-halo highlight system:
- **Legend & Curve Selection**: Clicking any container in the canvas, or clicking its corresponding entry in the telemetry graph legend, activates focused tracking.
- **Graphline Halo (0.42 Opacity)**: The selected curve in the graph receives a soft, widened halo beneath the main line, instantly differentiating it from overlapping curves without losing color clarity.
- **Container Card Halo (0.52 Opacity)**: Simultaneously, the matching container on the canvas displays a wide luminous halo behind its border, allowing immediate spatial identification across large site layouts.
- **Ctrl + Click Multi-Highlight**: Hold `Ctrl` or `Cmd` to highlight two or more containers together, enabling direct visual comparison between interconnected excavations and buffer stockpiles.
- **Visibility Toggles**: Use the eye/checkbox icons in the legend to hide unselected series completely, isolating high-priority bottlenecks.

*(Embedded in OpenOffice Document: Figure 7.1 — Telemetry Graph panel)*

---

## 8. Preset Bar & Batch Configuration

Located below the primary navigation bar, the Batch Preset Bar accelerates scenario planning:
- **Swell Presets**: One-click toggling between Standard Gravel/Clay (1.15x swell), Blasted Rock (1.25x swell), and Saturated Wet Material (1.35x swell).
- **Capacity Buffers**: Quickly scale all stockpile capacities up or down by 10%, 25%, or 50% to test wet weather delays or construction phase shifts.
- **Haul Fleet Multipliers**: Instantly apply shift length adjustments (e.g., 10-hour single shift vs. 24-hour continuous haulage) to all active links.

---

## 9. CSV Data Model & Export Specifications

All simulation topologies and daily operational outputs are fully accessible through standard CSV import and export.

### 9.1 Model Structure CSV Specification
| CSV Column | Description & Expected Values |
| :--- | :--- |
| `record_type` | `NODE` for container definitions, `LINK` for transfer haulage routes. |
| `id, name, type` | Unique string identifier, display label, and entity type (`excavation`, `stockpile`, `external`). |
| `x, y` | Canvas pixel coordinates of container top-left corner. |
| `initial_volume, max_capacity` | Initial starting volume (m³) and maximum storage threshold (m³). |
| `bulk_in, bulk_out` | Volumetric expansion factors (e.g. 1.15, 1.00). |
| `source_id, target_id, planned_rate` | For LINK records: Origin node ID, destination node ID, and daily nominal haul capacity (m³/day). |

### 9.2 Simulation Daily Telemetry CSV Specification
Exported simulation audit logs provide complete 30-day discrete accounting:
- `day`: Integer projection day (1 to 30).
- `container_id, container_name`: Target facility identification.
- `start_volume, end_volume`: Beginning and ending day volumes (m³).
- `total_inflow, total_outflow`: Cumulative daily transfer volumes (m³).
- `utilization_pct`: Stockpile volume as a percentage of maximum capacity.
- `operational_status`: Operational status code (`FULL_FLOW`, `RESTRICTED`, `OVERFLOW_HOLD`, `DEPLETED`).

*(Placeholder in OpenOffice Document: Figure 9.1 — CSV Export Configuration Modal)*

---

## 10. Quick Reference & Operational Shortcuts

| Keyboard / Mouse Action | Operation & Result |
| :--- | :--- |
| **Left Click Container** | Select single container; open node inspector; trigger luminous 0.52 halo. |
| **Ctrl + Click (or Cmd + Click)** | Multi-select containers or multi-highlight telemetry graph curves. |
| **Drag Container** | Reposition on canvas with automatic 12px gap magnetic edge snapping (within 24px range). |
| **Middle Click / Space + Drag** | Pan canvas viewport across infinite layout space. |
| **Mouse Wheel** | Zoom canvas in and out centered on cursor. |
| **Click Route Line / Badge** | Open route inspector to configure daily haul capacity and truck fleet allocation. |
| **Spacebar (Playback Mode)** | Toggle simulation playback between Play and Pause. |

---

*OpenOffice User Manual Document generated and saved at `/Material_Transfer_Simulation_User_Manual.odt`.*
"""
    with open(MD_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"Created Markdown manual at {MD_OUTPUT_PATH}")

if __name__ == "__main__":
    build_odt_manual()
