"use client";

import { Check, Mail, MessageCircle, MessageSquare, Phone, Smartphone } from "lucide-react";
import { composeForChannel, SMS_LIMIT, type ChannelPieceInput } from "@/lib/notificaciones/canales";
import type { ContactChannel } from "@/lib/types";

/**
 * Cómo se ve la pieza en el canal que se eligió.
 *
 * Existe porque "el motor eligió WhatsApp" es una afirmación que nadie puede
 * comprobar mirando una pantalla de correo. Ver la burbuja verde, el SMS con su
 * contador de caracteres y el guion de llamada uno al lado del otro es lo que
 * convierte la decisión de canal en algo evidente.
 *
 * Es una maqueta, no un envío. Lo dice cada tarjeta.
 */

const CHANNEL_META: Record<ContactChannel, { label: string; icon: typeof Mail }> = {
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle },
  SMS: { label: "SMS", icon: MessageSquare },
  EMAIL: { label: "Correo", icon: Mail },
  CALL: { label: "Llamada", icon: Phone },
  IN_APP: { label: "Portal", icon: Smartphone },
};

export function ChannelPreview({ compact = false, ...input }: ChannelPieceInput & { compact?: boolean }) {
  const piece = composeForChannel(input);
  const { label, icon: Icon } = CHANNEL_META[piece.channel];
  const now = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  return (
    <figure className={`channel-preview channel-${piece.channel.toLowerCase()}${compact ? " compact" : ""}`}>
      <figcaption>
        <span><Icon size={14}/> {label}</span>
        <small>Vista previa · no se envió nada</small>
      </figcaption>

      <div className="channel-frame">
        {piece.channel === "WHATSAPP" && (
          <div className="wa-thread">
            <header><span className="wa-avatar">C</span><div><strong>{piece.header}</strong><small>en línea</small></div></header>
            <div className="wa-bubble">
              <p>{piece.body}</p>
              {piece.cta && <button type="button" disabled>{piece.cta}</button>}
              <span className="wa-meta">{now} <Check size={11}/><Check size={11}/></span>
            </div>
          </div>
        )}

        {piece.channel === "SMS" && (
          <div className="sms-thread">
            <header>{piece.header}</header>
            <div className="sms-bubble">{piece.body}</div>
            <span className="sms-count">{piece.body.length}/{SMS_LIMIT} caracteres · 1 segmento</span>
          </div>
        )}

        {piece.channel === "EMAIL" && (
          <div className="mail-thread">
            <header>
              <span className="mail-from">Colsubsidio · orientacion@colsubsidio.test</span>
              <strong>{piece.header}</strong>
            </header>
            <p>{piece.body}</p>
            {piece.cta && <button type="button" disabled>{piece.cta}</button>}
          </div>
        )}

        {piece.channel === "CALL" && (
          <div className="call-card">
            <header><Phone size={15}/> {piece.header}</header>
            <blockquote>{piece.body}</blockquote>
          </div>
        )}

        {piece.channel === "IN_APP" && (
          <div className="inapp-card">
            <header><Smartphone size={14}/> Portal Colsubsidio</header>
            <strong>{piece.header}</strong>
            <p>{piece.body}</p>
            {piece.cta && <button type="button" disabled>{piece.cta}</button>}
          </div>
        )}
      </div>

      <p className="channel-note">{piece.note}</p>
    </figure>
  );
}
