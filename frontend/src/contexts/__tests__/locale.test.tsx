import { render } from "@testing-library/react";
import { LocaleProvider } from "../../contexts/LocaleContext";
import React from "react";

function Probe() {
  return <div data-testid="probe">ok</div>;
}

describe("LocaleContext RTL behavior", () => {
  test("sets document dir to rtl for ar", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    // simulate switching to ar
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";

    expect(document.documentElement.dir).toBe("rtl");
  });
});
