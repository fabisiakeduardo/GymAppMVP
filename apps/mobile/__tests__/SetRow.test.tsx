import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SetRow } from "../src/components/SetRow";
import type { LiveSet } from "../src/live/model";

const baseSet: LiveSet = {
  setNumber: 1,
  reps: 0,
  weight: 0,
  rpe: null,
  completed: false,
  synced: false,
};

describe("SetRow — fluxo de completar serie", () => {
  it("mostra a ultima vez", () => {
    const { getByText } = render(
      <SetRow
        set={baseSet}
        isCurrent={false}
        lastTime={{ weight: 80, reps: 8, when: "2026-01-01T10:00:00.000Z" }}
        onComplete={() => {}}
        onEdit={() => {}}
      />,
    );
    expect(getByText("última vez: 80 kg × 8")).toBeTruthy();
  });

  it("ao digitar carga/reps e tocar no check, dispara onComplete com os valores", () => {
    const onComplete = jest.fn();
    const { getByLabelText } = render(
      <SetRow set={baseSet} isCurrent={false} lastTime={null} onComplete={onComplete} onEdit={() => {}} />,
    );

    fireEvent.changeText(getByLabelText("Carga"), "100");
    fireEvent.changeText(getByLabelText("Reps"), "5");
    fireEvent.press(getByLabelText("Marcar série 1 como feita"));

    expect(onComplete).toHaveBeenCalledWith({ weight: 100, reps: 5 });
  });

  it("aceita carga com virgula (padrao brasileiro)", () => {
    const onComplete = jest.fn();
    const { getByLabelText } = render(
      <SetRow set={baseSet} isCurrent={false} lastTime={null} onComplete={onComplete} onEdit={() => {}} />,
    );
    fireEvent.changeText(getByLabelText("Carga"), "62,5");
    fireEvent.changeText(getByLabelText("Reps"), "10");
    fireEvent.press(getByLabelText("Marcar série 1 como feita"));
    expect(onComplete).toHaveBeenCalledWith({ weight: 62.5, reps: 10 });
  });
});
