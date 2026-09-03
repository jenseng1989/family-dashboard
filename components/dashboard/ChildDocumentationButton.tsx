"use client";

import {
  Download,
  FileText,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import {
  useState,
} from "react";

type ChildDocumentationButtonProps = {
  memberId: string;
  displayName: string;
};

function getFilenameFromDisposition(
  disposition: string | null,
  fallbackName: string
) {
  if (!disposition) {
    return fallbackName;
  }

  const utf8Match =
    disposition.match(
      /filename\*=UTF-8''([^;]+)/i
    );

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(
        utf8Match[1]
      );
    } catch {
      return utf8Match[1];
    }
  }

  const filenameMatch =
    disposition.match(
      /filename="?([^";]+)"?/i
    );

  return (
    filenameMatch?.[1] ??
    fallbackName
  );
}

function safeFilename(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .toLowerCase();
}

export default function ChildDocumentationButton({
  memberId,
  displayName,
}: ChildDocumentationButtonProps) {
  const [
    isCreating,
    setIsCreating,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  async function handleCreatePdf() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const response =
        await fetch(
          `/api/child-documentation?memberId=${encodeURIComponent(
            memberId
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      if (!response.ok) {
        let message =
          "PDF-dokumentet kunde inte skapas.";

        try {
          const body =
            (await response.json()) as {
              error?: string;
            };

          if (body.error) {
            message =
              body.error;
          }
        } catch {
          // Svaret var inte JSON.
        }

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const fallbackFilename =
        `${safeFilename(
          displayName
        ) || "barn"}-dokumentation.pdf`;

      const filename =
        getFilenameFromDisposition(
          response.headers.get(
            "Content-Disposition"
          ),
          fallbackFilename
        );

      const link =
        document.createElement(
          "a"
        );

      link.href =
        objectUrl;

      link.download =
        filename;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            objectUrl
          );
        },
        1000
      );
    } catch (error) {
      console.error(
        "Kunde inte skapa barnets dokumentation:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "PDF-dokumentet kunde inte skapas."
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={
          handleCreatePdf
        }
        disabled={
          isCreating
        }
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300/20 bg-blue-400/10 px-4 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/20 disabled:cursor-wait disabled:opacity-60"
      >
        {isCreating ? (
          <LoaderCircle
            size={17}
            className="animate-spin"
          />
        ) : (
          <FileText
            size={17}
          />
        )}

        {isCreating
          ? "Skapar dokument…"
          : "Skapa PDF"}

        {!isCreating && (
          <Download
            size={15}
            className="opacity-70"
          />
        )}
      </button>

      {errorMessage && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3">
          <TriangleAlert
            size={16}
            className="mt-0.5 shrink-0 text-red-300"
          />

          <p className="text-xs leading-5 text-red-100/80">
            {
              errorMessage
            }
          </p>
        </div>
      )}
    </div>
  );
}
