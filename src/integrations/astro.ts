export const saveScrollPosition = () => {
  const state: {
    index: number;
    scrollX: number;
    scrollY: number;
  } | null = history.state;

  if (!state) return;

  sessionStorage.setItem(
    location.pathname,
    JSON.stringify({
      left: state.scrollX,
      top: state.scrollY,
    } satisfies ScrollToOptions)
  );
};
