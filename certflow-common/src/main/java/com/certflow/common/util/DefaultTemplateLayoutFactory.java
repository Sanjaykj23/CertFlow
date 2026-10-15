package com.certflow.common.util;

import com.certflow.common.domain.TemplateLayoutConfig;

import java.util.ArrayList;
import java.util.List;

public final class DefaultTemplateLayoutFactory {

    private DefaultTemplateLayoutFactory() {}

    public static TemplateLayoutConfig createDefaultLandscapeLayout() {
        List<TemplateLayoutConfig.TextElement> elements = new ArrayList<>();

        // 1. Organization Name
        elements.add(TemplateLayoutConfig.TextElement.builder()
                .id("org-name")
                .placeholder("{{organization_name}}")
                .x(421)
                .y(90)
                .fontSize(16)
                .fontFamily("Helvetica")
                .fontStyle("BOLD")
                .colorHex("#64748B")
                .alignment("CENTER")
                .defaultValue("CERTFLOW ACADEMY")
                .build());

        // 2. Certificate Title
        elements.add(TemplateLayoutConfig.TextElement.builder()
                .id("cert-title")
                .placeholder("CERTIFICATE OF RECOGNITION")
                .x(421)
                .y(140)
                .fontSize(28)
                .fontFamily("Times-Roman")
                .fontStyle("BOLD")
                .colorHex("#0F172A")
                .alignment("CENTER")
                .defaultValue("CERTIFICATE OF RECOGNITION")
                .build());

        // 3. Presentation line
        elements.add(TemplateLayoutConfig.TextElement.builder()
                .id("presented-to")
                .placeholder("THIS IS PROUDLY PRESENTED TO")
                .x(421)
                .y(190)
                .fontSize(13)
                .fontFamily("Helvetica")
                .fontStyle("NORMAL")
                .colorHex("#64748B")
                .alignment("CENTER")
                .defaultValue("THIS IS PROUDLY PRESENTED TO")
                .build());

        // 4. Participant Name
        elements.add(TemplateLayoutConfig.TextElement.builder()
                .id("participant-name")
                .placeholder("{{participant_name}}")
                .x(421)
                .y(250)
                .fontSize(32)
                .fontFamily("Times-Roman")
                .fontStyle("BOLD")
                .colorHex("#1E3A8A") // Classic Navy
                .alignment("CENTER")
                .defaultValue("Arun Kumar")
                .build());

        // 5. Achievement line
        elements.add(TemplateLayoutConfig.TextElement.builder()
                .id("achievement")
                .placeholder("for exemplary participation and accomplishment as {{certificate_type}} in")
                .x(421)
                .y(300)
                .fontSize(14)
                .fontFamily("Helvetica")
                .fontStyle("NORMAL")
                .colorHex("#334155")
                .alignment("CENTER")
                .defaultValue("for exemplary participation and accomplishment as Participant in")
                .build());

        // 6. Event Name
        elements.add(TemplateLayoutConfig.TextElement.builder()
                .id("event-name")
                .placeholder("{{event_name}}")
                .x(421)
                .y(340)
                .fontSize(22)
                .fontFamily("Helvetica")
                .fontStyle("BOLD")
                .colorHex("#0F172A")
                .alignment("CENTER")
                .defaultValue("National AI Hackathon 2026")
                .build());

        // 7. Issue Date & Details
        elements.add(TemplateLayoutConfig.TextElement.builder()
                .id("issue-date")
                .placeholder("Issued on {{issue_date}}")
                .x(150)
                .y(480)
                .fontSize(12)
                .fontFamily("Helvetica")
                .fontStyle("NORMAL")
                .colorHex("#64748B")
                .alignment("CENTER")
                .defaultValue("Issued on 2026-09-28")
                .build());

        // 8. Certificate Number
        elements.add(TemplateLayoutConfig.TextElement.builder()
                .id("cert-id")
                .placeholder("Certificate ID: {{certificate_id}}")
                .x(150)
                .y(505)
                .fontSize(11)
                .fontFamily("Courier")
                .fontStyle("NORMAL")
                .colorHex("#94A3B8")
                .alignment("CENTER")
                .defaultValue("Certificate ID: CF-2026-X9K2-7MPQ")
                .build());

        // 9. QR Code (Bottom Right)
        TemplateLayoutConfig.QrElement qr = TemplateLayoutConfig.QrElement.builder()
                .enabled(true)
                .x(690)
                .y(430)
                .size(85)
                .build();

        return TemplateLayoutConfig.builder()
                .orientation("LANDSCAPE")
                .width(842)
                .height(595)
                .textElements(elements)
                .qrCode(qr)
                .build();
    }
}
