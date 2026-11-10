package com.repuestosya.pedidos.application.commands;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.repuestosya.pedidos.domain.entities.OfferAcceptedPayload;
import com.repuestosya.pedidos.domain.enums.DeliveryType;
import com.repuestosya.pedidos.domain.repositories.ProcessedEventRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class CreateOrderFromOfferAcceptedTest {

    private final OrderCreationTransaction transaction = mock(OrderCreationTransaction.class);
    private final ProcessedEventRepository processedEventRepository = mock(ProcessedEventRepository.class);
    private final CreateOrderFromOfferAccepted command =
            new CreateOrderFromOfferAccepted(transaction, processedEventRepository);

    private OfferAcceptedPayload payload() {
        return new OfferAcceptedPayload(
                10L, 20L, 30L, 40L, "AutoParts Center", new BigDecimal("620"), "BOB", DeliveryType.DELIVERY, 3,
                "Frenos delanteros", "Toyota Corolla 2018");
    }

    @Test
    void creaElPedidoCuandoElEventoEsNuevo() {
        when(processedEventRepository.isProcessed("evt-1")).thenReturn(false);

        command.execute(payload(), "evt-1", "OFFER_ACCEPTED", "corr-1");

        verify(transaction).createOrderAndPublish(payload(), "evt-1", "OFFER_ACCEPTED", "corr-1");
        verify(processedEventRepository, never()).markProcessed(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void esIdempotenteConElMismoEventId() {
        when(processedEventRepository.isProcessed("evt-1")).thenReturn(true);

        command.execute(payload(), "evt-1", "OFFER_ACCEPTED", "corr-1");

        verify(transaction, never()).createOrderAndPublish(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void offerIdDuplicadoConEventIdDistintoSeMarcaProcesadoSinCrearOtroPedido() {
        when(processedEventRepository.isProcessed("evt-2")).thenReturn(false);
        doThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint \"uq_orders_offer_id\""))
                .when(transaction)
                .createOrderAndPublish(payload(), "evt-2", "OFFER_ACCEPTED", "corr-2");

        command.execute(payload(), "evt-2", "OFFER_ACCEPTED", "corr-2");

        verify(processedEventRepository).markProcessed("evt-2", "OFFER_ACCEPTED");
    }

    @Test
    void otroErrorDeIntegridadNoSeSilenciaYSeRelanza() {
        when(processedEventRepository.isProcessed("evt-3")).thenReturn(false);
        doThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint \"otra_constraint\""))
                .when(transaction)
                .createOrderAndPublish(payload(), "evt-3", "OFFER_ACCEPTED", "corr-3");

        assertThatThrownBy(() -> command.execute(payload(), "evt-3", "OFFER_ACCEPTED", "corr-3"))
                .isInstanceOf(DataIntegrityViolationException.class);

        verify(processedEventRepository, never()).markProcessed("evt-3", "OFFER_ACCEPTED");
    }
}
