export function ThemeInit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var theme = localStorage.getItem("cannalog_theme");
              if (theme === "light") {
                document.documentElement.classList.add("light");
                document.documentElement.style.colorScheme = "light";
              }
            } catch(e) {}
          })();
        `,
      }}
    />
  );
}
