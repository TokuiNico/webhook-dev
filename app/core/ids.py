import ulid as _ulid


def ulid() -> str:
    return _ulid.new().str()
