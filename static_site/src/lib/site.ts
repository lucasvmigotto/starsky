/**
 * Sample moment (Nagahama, Shiga, Japan — 1998-11-17 11:17 JST) so the
 * explorer opens to a real sky when there is no `#s=` link. Generated with
 * the repo encoder (`starpy.share.spec.encode_payload`) from the same
 * options as the previous sample; only moment/place/title changed.
 */
export const SAMPLE_FRAGMENT =
  "eNpVjr1uwzAMhF_F4Oy4UoIkrreuHbo0UxeDdViLrSwJEtPADfLupfsHdCLx3fF4F_Ao0G22zaY17c62NfgYoLObXbPet1uzUxKTcAwFugsMOoW8HinpPT6TVy75RPV_7Y--cHE0U18kUxjFaXZjahh9PP9alr3nIBQKy_xjmHAMLKcj9Z4n1o7bRqtMHPpCCfPXE-hMY4zilOMrDd8ItESmOGZMjgeooThMpHzgPHhSICx-AQdH1RSLVDylmAWDVBk5zNURZ7hqqsdh8T3giA4nrKtHx6OOe0wYlqAPVe8K480hvs1Rybu2r-HsKPQnGVS1t7ftytqV3R_MurP7zpgnuH4CphZ6hQ";

/** Full-app deep-link target, configurable at build time. */
const configured: unknown = import.meta.env["VITE_FULL_APP_URL"];
export const FULL_APP_URL =
  typeof configured === "string" && configured.length > 0
    ? configured
    : "https://huggingface.co/spaces/lucasvmigotto/starpy";
