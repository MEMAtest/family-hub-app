import { render, screen } from "@testing-library/react";
import { MerchantSource } from "./MerchantSource";

test("does not invent a source for unresearched payees", () => {
  const { container } = render(<MerchantSource />);
  expect(container).toBeEmptyDOMElement();
});

test("links the primary business source without leaking the finance-page referrer", () => {
  render(
    <MerchantSource
      evidence={{
        url: "https://anjomanfood.com/store-locator",
        checkedAt: "2026-10-23",
        note: "Supplier identifies legal name and supermarket.",
      }}
    />,
  );
  const link = screen.getByRole("link", { name: "Business source" });
  expect(link).toHaveAttribute("href", "https://anjomanfood.com/store-locator");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
  expect(link).toHaveAttribute("referrerpolicy", "no-referrer");
  expect(link).toHaveAttribute(
    "title",
    "Supplier identifies legal name and supermarket. Checked 2026-10-23.",
  );
});
