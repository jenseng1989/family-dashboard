"use client";

import ExpensesWidget from "@/components/dashboard/ExpensesWidget";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import ShoppingList from "@/components/dashboard/ShoppingList";
import WidgetGate from "@/components/dashboard/WidgetGate";
import {
  getWidgetGroup,
} from "@/config/widgets";
import {
  buildDashboardWidgets,
} from "@/lib/dashboard-widgets";

const startShoppingConfig =
  getWidgetGroup("start-shopping");

const shoppingContentMap = {
  "shopping-list": <ShoppingList />,
  expenses: <ExpensesWidget />,
};

export default function StartShoppingTab() {
  return (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={buildDashboardWidgets(
        startShoppingConfig,
        shoppingContentMap
      )}
    />
  );
}
