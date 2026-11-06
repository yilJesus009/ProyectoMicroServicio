"""Envelope de respuesta {status, msg, data} — docs/convenciones.md."""
from rest_framework.response import Response


def success(data=None, msg="Operación exitosa", status=200):
    return Response({"status": status, "msg": msg, "data": data}, status=status)


def error(msg, status=400, data=None):
    return Response({"status": status, "msg": msg, "data": data}, status=status)
