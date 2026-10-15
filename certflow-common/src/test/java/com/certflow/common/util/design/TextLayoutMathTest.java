package com.certflow.common.util.design;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TextLayoutMathTest {

    private static final double EPS = 1e-9;

    @Test
    @DisplayName("Top aligned single line: baseline = y + lineHeight/2 + 0.32 * fontSize")
    void singleLineTop() {
        TextLayoutMath.Result r = TextLayoutMath.layout("Hi", false, 100, 50, 400, 40, 20, 1.2, "center", "top");
        assertEquals(1, r.lines.size());
        assertEquals(300, r.anchorX, EPS);
        assertEquals(24, r.lineHeightPx, EPS);
        assertEquals(24, r.totalHeight, EPS);
        assertEquals(50 + 12 + 0.32 * 20, r.lines.get(0).baselineY, EPS);
    }

    @Test
    @DisplayName("Multi line, middle and bottom vertical alignment")
    void multiLineVerticalAlign() {
        TextLayoutMath.Result mid = TextLayoutMath.layout("a\nb", false, 0, 0, 100, 100, 10, 1.5, "left", "middle");
        assertEquals(2, mid.lines.size());
        assertEquals(0, mid.anchorX, EPS);
        // totalHeight 30, top = 35
        assertEquals(35 + 7.5 + 3.2, mid.lines.get(0).baselineY, EPS);
        assertEquals(35 + 15 + 7.5 + 3.2, mid.lines.get(1).baselineY, EPS);

        TextLayoutMath.Result bottom = TextLayoutMath.layout("a\nb", false, 0, 0, 100, 100, 10, 1.5, "right", "bottom");
        assertEquals(100, bottom.anchorX, EPS);
        // top = 100 - 30 = 70
        assertEquals(70 + 7.5 + 3.2, bottom.lines.get(0).baselineY, EPS);
    }

    @Test
    @DisplayName("Uppercase and trailing empty lines are preserved like the browser")
    void uppercaseAndEmptyLines() {
        TextLayoutMath.Result r = TextLayoutMath.layout("ab\n", true, 0, 0, 10, 10, 10, 1, "center", "top");
        assertEquals(2, r.lines.size());
        assertEquals("AB", r.lines.get(0).text);
        assertEquals("", r.lines.get(1).text);
    }

    @Test
    @DisplayName("Line start and width with letter spacing")
    void lineStartAndWidth() {
        double w = TextLayoutMath.lineWidth(100, 2, 6);
        assertEquals(110, w, EPS);
        assertEquals(200, TextLayoutMath.lineStartX(200, "left", w), EPS);
        assertEquals(90, TextLayoutMath.lineStartX(200, "right", w), EPS);
        assertEquals(145, TextLayoutMath.lineStartX(200, "center", w), EPS);
        assertEquals(0, TextLayoutMath.lineWidth(0, 3, 0), EPS);
    }
}
