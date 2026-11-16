// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TrustTradeEscrow {
    enum Status {
        Funded,
        Shipped,
        Released,
        Refunded,
        Disputed
    }

    struct Escrow {
        address payable buyer;
        address payable seller;
        uint256 amount;
        uint256 createdAt;
        uint256 deliveryDeadline;
        bytes32 listingId;
        Status status;
    }

    address public immutable admin;
    uint256 public nextEscrowId;
    mapping(uint256 => Escrow) private escrows;
    mapping(address => uint256) private pendingWithdrawals;
    bool private locked;

    event EscrowCreated(
        uint256 indexed escrowId,
        bytes32 indexed listingId,
        address indexed buyer,
        address seller,
        uint256 amount,
        uint256 deliveryDeadline
    );
    event EscrowShipped(uint256 indexed escrowId);
    event EscrowReleased(uint256 indexed escrowId, uint256 amount);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);
    event EscrowDisputed(uint256 indexed escrowId, address indexed raisedBy);
    event DisputeResolved(uint256 indexed escrowId, bool releaseToSeller, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    error IncorrectPaymentAmount();
    error InvalidState();
    error DeadlineNotReached();
    error EscrowNotFound();
    error TransferFailed();
    error Reentrancy();

    modifier nonReentrant() {
        if (locked) revert Reentrancy();
        locked = true;
        _;
        locked = false;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    constructor(address adminAddress) {
        if (adminAddress == address(0)) revert InvalidAddress();
        admin = adminAddress;
    }

    function createEscrow(
        address payable seller,
        bytes32 listingId,
        uint256 deliveryWindow,
        uint256 expectedAmount
    ) external payable returns (uint256 escrowId) {
        if (seller == address(0) || seller == msg.sender) revert InvalidAddress();
        if (
            msg.value == 0 ||
            deliveryWindow == 0 ||
            expectedAmount == 0
        ) revert InvalidAmount();
        if (msg.value != expectedAmount) revert IncorrectPaymentAmount();

        escrowId = nextEscrowId++;
        uint256 deadline = block.timestamp + deliveryWindow;
        escrows[escrowId] = Escrow({
            buyer: payable(msg.sender),
            seller: seller,
            amount: msg.value,
            createdAt: block.timestamp,
            deliveryDeadline: deadline,
            listingId: listingId,
            status: Status.Funded
        });

        emit EscrowCreated(
            escrowId,
            listingId,
            msg.sender,
            seller,
            msg.value,
            deadline
        );
    }

    function markShipped(uint256 escrowId) external {
        Escrow storage escrow = _getEscrow(escrowId);
        if (msg.sender != escrow.seller) revert Unauthorized();
        if (escrow.status != Status.Funded) revert InvalidState();

        escrow.status = Status.Shipped;
        emit EscrowShipped(escrowId);
    }

    function confirmDelivery(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _getEscrow(escrowId);
        if (msg.sender != escrow.buyer) revert Unauthorized();
        if (
            escrow.status != Status.Funded &&
            escrow.status != Status.Shipped
        ) revert InvalidState();

        uint256 amount = escrow.amount;
        escrow.status = Status.Released;
        _queuePayment(escrow.seller, amount);
        emit EscrowReleased(escrowId, amount);
    }

    function refundBeforeShipment(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _getEscrow(escrowId);
        if (msg.sender != escrow.buyer) revert Unauthorized();
        if (escrow.status != Status.Funded) revert InvalidState();

        uint256 amount = escrow.amount;
        escrow.status = Status.Refunded;
        _queuePayment(escrow.buyer, amount);
        emit EscrowRefunded(escrowId, amount);
    }

    function refundAfterDeadline(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _getEscrow(escrowId);
        if (msg.sender != escrow.buyer) revert Unauthorized();
        if (block.timestamp < escrow.deliveryDeadline) revert DeadlineNotReached();
        if (
            escrow.status != Status.Funded &&
            escrow.status != Status.Shipped &&
            escrow.status != Status.Disputed
        ) revert InvalidState();

        uint256 amount = escrow.amount;
        escrow.status = Status.Refunded;
        _queuePayment(escrow.buyer, amount);
        emit EscrowRefunded(escrowId, amount);
    }

    function raiseDispute(uint256 escrowId) external {
        Escrow storage escrow = _getEscrow(escrowId);
        if (msg.sender != escrow.buyer && msg.sender != escrow.seller) {
            revert Unauthorized();
        }
        if (
            escrow.status != Status.Funded &&
            escrow.status != Status.Shipped
        ) revert InvalidState();

        escrow.status = Status.Disputed;
        emit EscrowDisputed(escrowId, msg.sender);
    }

    function resolveDispute(
        uint256 escrowId,
        bool releaseToSeller
    ) external onlyAdmin nonReentrant {
        Escrow storage escrow = _getEscrow(escrowId);
        if (escrow.status != Status.Disputed) revert InvalidState();

        uint256 amount = escrow.amount;
        escrow.status = releaseToSeller ? Status.Released : Status.Refunded;
        _queuePayment(releaseToSeller ? escrow.seller : escrow.buyer, amount);

        emit DisputeResolved(escrowId, releaseToSeller, amount);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert InvalidAmount();

        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Withdrawal(msg.sender, amount);
    }

    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return _getEscrow(escrowId);
    }

    function pendingWithdrawal(address account) external view returns (uint256) {
        return pendingWithdrawals[account];
    }

    function _getEscrow(uint256 escrowId) private view returns (Escrow storage escrow) {
        if (escrowId >= nextEscrowId) revert EscrowNotFound();
        escrow = escrows[escrowId];
    }

    function _queuePayment(address account, uint256 amount) private {
        pendingWithdrawals[account] += amount;
    }
}
